/**
 * バイナリファイルなどテキスト表示できない場合のプレースホルダ
 */
export function BinaryContent() {
  return (
    <div className="flex items-center justify-center absolute inset-0 z-10 text-sm bg-tk-elements-app-backgroundColor text-tk-elements-app-textColor">
      このファイル形式は表示できません。
    </div>
  );
}
