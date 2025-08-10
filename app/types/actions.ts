/**
 * アクション種別（ファイル生成/更新 or シェル実行）
 */
export type ActionType = 'file' | 'shell';

/**
 * すべてのアクションの共通ペイロード
 */
export interface BaseAction {
  content: string;
}

/**
 * ファイル生成/上書きアクション
 */
export interface FileAction extends BaseAction {
  type: 'file';
  filePath: string;
}

/**
 * シェル実行アクション（jsh -c）
 */
export interface ShellAction extends BaseAction {
  type: 'shell';
}

export type BoltAction = FileAction | ShellAction;

// ストリーム中のタグ解析時は一時的に type 未確定の BaseAction も扱う
export type BoltActionData = BoltAction | BaseAction;
