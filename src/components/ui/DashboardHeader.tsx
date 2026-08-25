"use client";

/** 학생/교사 화면 상단에 공통으로 쓰는 헤더 박스. 아이콘 + 본문(이름 등) + 우측 액션 버튼들로 구성한다. */
export function DashboardHeader({
  icon,
  actions,
  children,
}: {
  icon: React.ReactNode;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl p-3.5 sm:p-4 shadow-sm border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>{children}</div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">{actions}</div>
    </div>
  );
}
