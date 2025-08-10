/**
 * CodeMirrorEditor
 *
 * 日本語概要:
 * - CodeMirror v6 を用いたエディタラッパー。テーマ、言語、ショートカット、
 *   読み取り専用時のツールチップ、スクロール/変更イベントのデバウンス通知などを提供。
 * - ドキュメント（ファイル）ごとに EditorState を再利用し、不要な再構築を避ける。
 * - Cmd/Ctrl+S で保存、Tab で補完確定などの基本キー操作を定義。
 */
import { acceptCompletion, autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput, indentUnit } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { Compartment, EditorSelection, EditorState, StateEffect, StateField, type Extension } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  scrollPastEnd,
  showTooltip,
  tooltips,
  type Tooltip,
} from '@codemirror/view';
import { memo, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Theme } from '~/types/theme';
import { classNames } from '~/utils/classNames';
import { debounce } from '~/utils/debounce';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BinaryContent } from './BinaryContent';
import { getTheme, reconfigureTheme } from './cm-theme';
import { indentKeyBinding } from './indent';
import { getLanguage } from './languages';

const logger = createScopedLogger('CodeMirrorEditor');

export interface EditorDocument {
  value: string;
  isBinary: boolean;
  filePath: string;
  scroll?: ScrollPosition;
}

export interface EditorSettings {
  fontSize?: string;
  gutterFontSize?: string;
  tabSize?: number;
}

type TextEditorDocument = EditorDocument & {
  value: string;
};

export interface ScrollPosition {
  top: number;
  left: number;
}

export interface EditorUpdate {
  selection: EditorSelection;
  content: string;
}

export type OnChangeCallback = (update: EditorUpdate) => void;
export type OnScrollCallback = (position: ScrollPosition) => void;
export type OnSaveCallback = () => void;

interface Props {
  theme: Theme;
  id?: unknown;
  doc?: EditorDocument;
  editable?: boolean;
  debounceChange?: number;
  debounceScroll?: number;
  autoFocusOnDocumentChange?: boolean;
  onChange?: OnChangeCallback;
  onScroll?: OnScrollCallback;
  onSave?: OnSaveCallback;
  className?: string;
  settings?: EditorSettings;
}

type EditorStates = Map<string, EditorState>;

const readOnlyTooltipStateEffect = StateEffect.define<boolean>();

// 読み取り専用時に表示するツールチップの状態フィールド
const editableTooltipField = StateField.define<readonly Tooltip[]>({
  create: () => [],
  update(_tooltips, transaction) {
    if (!transaction.state.readOnly) {
      return [];
    }

    for (const effect of transaction.effects) {
      if (effect.is(readOnlyTooltipStateEffect) && effect.value) {
        return getReadOnlyTooltip(transaction.state);
      }
    }

    return [];
  },
  provide: (field) => {
    return showTooltip.computeN([field], (state) => state.field(field));
  },
});

const editableStateEffect = StateEffect.define<boolean>();

// editable フラグを EditorState に載せるためのフィールド
const editableStateField = StateField.define<boolean>({
  create() {
    return true;
  },
  update(value, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(editableStateEffect)) {
        return effect.value;
      }
    }

    return value;
  },
});

export const CodeMirrorEditor = memo(
  ({
    id,
    doc,
    debounceScroll = 100,
    debounceChange = 150,
    autoFocusOnDocumentChange = false,
    editable = true,
    onScroll,
    onChange,
    onSave,
    theme,
    settings,
    className = '',
  }: Props) => {
    renderLogger.trace('CodeMirrorEditor');

    const [languageCompartment] = useState(new Compartment());

    const containerRef = useRef<HTMLDivElement | null>(null);
    const viewRef = useRef<EditorView>();
    const themeRef = useRef<Theme>();
    const docRef = useRef<EditorDocument>();
    const editorStatesRef = useRef<EditorStates>();
    const onScrollRef = useRef(onScroll);
    const onChangeRef = useRef(onChange);
    const onSaveRef = useRef(onSave);

    /**
     * This effect is used to avoid side effects directly in the render function
     * and instead the refs are updated after each render.
     */
    // レンダリング後に最新の props を参照できるよう、ref を同期する
    useEffect(() => {
      onScrollRef.current = onScroll;
      onChangeRef.current = onChange;
      onSaveRef.current = onSave;
      docRef.current = doc;
      themeRef.current = theme;
    });

    // 初回マウント時に EditorView を生成し、カスタム dispatch で onChange を呼び出す
    useEffect(() => {
      const onUpdate = debounce((update: EditorUpdate) => {
        onChangeRef.current?.(update);
      }, debounceChange);

      const view = new EditorView({
        parent: containerRef.current!,
        dispatchTransactions(transactions) {
          const previousSelection = view.state.selection;

          view.update(transactions);

          const newSelection = view.state.selection;

          const selectionChanged =
            newSelection !== previousSelection &&
            (newSelection === undefined || previousSelection === undefined || !newSelection.eq(previousSelection));

          if (docRef.current && (transactions.some((transaction) => transaction.docChanged) || selectionChanged)) {
            onUpdate({
              selection: view.state.selection,
              content: view.state.doc.toString(),
            });

            editorStatesRef.current!.set(docRef.current.filePath, view.state);
          }
        },
      });

      viewRef.current = view;

      return () => {
        viewRef.current?.destroy();
        viewRef.current = undefined;
      };
    }, []);

    // テーマ変更時にエディタへ反映
    useEffect(() => {
      if (!viewRef.current) {
        return;
      }

      viewRef.current.dispatch({
        effects: [reconfigureTheme(theme)],
      });
    }, [theme]);

    // id 変化時に EditorState マップを初期化（別タブ/コンテキスト相当）
    useEffect(() => {
      editorStatesRef.current = new Map<string, EditorState>();
    }, [id]);

    // ドキュメント切替/更新時の反映ロジック
    useEffect(() => {
      const editorStates = editorStatesRef.current!;
      const view = viewRef.current!;
      const theme = themeRef.current!;

      if (!doc) {
        const state = newEditorState('', theme, settings, onScrollRef, debounceScroll, onSaveRef, [
          languageCompartment.of([]),
        ]);

        view.setState(state);

        setNoDocument(view);

        return;
      }

      if (doc.isBinary) {
        return;
      }

      if (doc.filePath === '') {
        logger.warn('File path should not be empty');
      }

      let state = editorStates.get(doc.filePath);

      if (!state) {
        state = newEditorState(doc.value, theme, settings, onScrollRef, debounceScroll, onSaveRef, [
          languageCompartment.of([]),
        ]);

        editorStates.set(doc.filePath, state);
      }

      view.setState(state);

      setEditorDocument(
        view,
        theme,
        editable,
        languageCompartment,
        autoFocusOnDocumentChange,
        doc as TextEditorDocument,
      );
    }, [doc?.value, editable, doc?.filePath, autoFocusOnDocumentChange]);

    return (
      <div className={classNames('relative h-full', className)}>
        {doc?.isBinary && <BinaryContent />}
        <div className="h-full overflow-hidden" ref={containerRef} />
      </div>
    );
  },
);

export default CodeMirrorEditor;

CodeMirrorEditor.displayName = 'CodeMirrorEditor';

// 新規 EditorState を生成するヘルパ
function newEditorState(
  content: string,
  theme: Theme,
  settings: EditorSettings | undefined,
  onScrollRef: MutableRefObject<OnScrollCallback | undefined>,
  debounceScroll: number,
  onFileSaveRef: MutableRefObject<OnSaveCallback | undefined>,
  extensions: Extension[],
) {
  return EditorState.create({
    doc: content,
    extensions: [
      // スクロール/keydown の DOM ハンドラ
      EditorView.domEventHandlers({
        scroll: debounce((event, view) => {
          if (event.target !== view.scrollDOM) {
            return;
          }

          onScrollRef.current?.({ left: view.scrollDOM.scrollLeft, top: view.scrollDOM.scrollTop });
        }, debounceScroll),
        keydown: (event, view) => {
          if (view.state.readOnly) {
            view.dispatch({
              effects: [readOnlyTooltipStateEffect.of(event.key !== 'Escape')],
            });

            return true;
          }

          return false;
        },
      }),
      getTheme(theme, settings),
      history(),
      // 基本キーマップと独自ショートカット
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        { key: 'Tab', run: acceptCompletion },
        {
          key: 'Mod-s',
          preventDefault: true,
          run: () => {
            onFileSaveRef.current?.();
            return true;
          },
        },
        indentKeyBinding,
      ]),
      indentUnit.of('\t'),
      autocompletion({
        closeOnBlur: false,
      }),
      // 補完ツールチップ等の位置調整
      tooltips({
        position: 'absolute',
        parent: document.body,
        tooltipSpace: (view) => {
          const rect = view.dom.getBoundingClientRect();

          return {
            top: rect.top - 50,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right + 10,
          };
        },
      }),
      closeBrackets(),
      lineNumbers(),
      scrollPastEnd(),
      dropCursor(),
      drawSelection(),
      bracketMatching(),
      EditorState.tabSize.of(settings?.tabSize ?? 2),
      indentOnInput(),
      editableTooltipField,
      editableStateField,
      EditorState.readOnly.from(editableStateField, (editable) => !editable),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      foldGutter({
        markerDOM: (open) => {
          const icon = document.createElement('div');

          icon.className = `fold-icon ${open ? 'i-ph-caret-down-bold' : 'i-ph-caret-right-bold'}`;

          return icon;
        },
      }),
      ...extensions,
    ],
  });
}

// ドキュメントなし（空）をエディタに設定
function setNoDocument(view: EditorView) {
  view.dispatch({
    selection: { anchor: 0 },
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: '',
    },
  });

  view.scrollDOM.scrollTo(0, 0);
}

// ドキュメントをエディタに適用し、言語/テーマ/スクロール/フォーカスを更新
function setEditorDocument(
  view: EditorView,
  theme: Theme,
  editable: boolean,
  languageCompartment: Compartment,
  autoFocus: boolean,
  doc: TextEditorDocument,
) {
  if (doc.value !== view.state.doc.toString()) {
    view.dispatch({
      selection: { anchor: 0 },
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: doc.value,
      },
    });
  }

  view.dispatch({
    effects: [editableStateEffect.of(editable && !doc.isBinary)],
  });

  getLanguage(doc.filePath).then((languageSupport) => {
    if (!languageSupport) {
      return;
    }

    view.dispatch({
      effects: [languageCompartment.reconfigure([languageSupport]), reconfigureTheme(theme)],
    });

    requestAnimationFrame(() => {
      const currentLeft = view.scrollDOM.scrollLeft;
      const currentTop = view.scrollDOM.scrollTop;
      const newLeft = doc.scroll?.left ?? 0;
      const newTop = doc.scroll?.top ?? 0;

      const needsScrolling = currentLeft !== newLeft || currentTop !== newTop;

      if (autoFocus && editable) {
        if (needsScrolling) {
          // we have to wait until the scroll position was changed before we can set the focus
          view.scrollDOM.addEventListener(
            'scroll',
            () => {
              view.focus();
            },
            { once: true },
          );
        } else {
          // if the scroll position is still the same we can focus immediately
          view.focus();
        }
      }

      view.scrollDOM.scrollTo(newLeft, newTop);
    });
  });
}

// 読み取り専用時に、キャレット位置に編集不可のツールチップを出す
function getReadOnlyTooltip(state: EditorState) {
  if (!state.readOnly) {
    return [];
  }

  return state.selection.ranges
    .filter((range) => {
      return range.empty;
    })
    .map((range) => {
      return {
        pos: range.head,
        above: true,
        strictSide: true,
        arrow: true,
        create: () => {
          const divElement = document.createElement('div');
          divElement.className = 'cm-readonly-tooltip';
          divElement.textContent = 'AI の応答生成中は編集できません';

          return { dom: divElement };
        },
      };
    });
}
