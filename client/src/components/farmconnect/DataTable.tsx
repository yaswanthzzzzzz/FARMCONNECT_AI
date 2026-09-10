import type { ReactNode } from "react";

export type DataColumn<T> = { key: string; label: string; render: (row: T) => ReactNode };

export function DataTable<T extends { id: string }>({ columns, rows, emptyMessage = "No records to show yet." }: { columns: DataColumn<T>[]; rows: T[]; emptyMessage?: string }) {
  if (!rows.length) return <div className="rounded-2xl border border-dashed border-[#cfe0c7] p-8 text-center text-sm text-[#718274]">{emptyMessage}</div>;
  return <div className="overflow-x-auto rounded-2xl border border-[#e5ecdf]"><table className="min-w-full border-collapse text-left"><thead className="bg-[#f7fbf3]"><tr>{columns.map(column => <th key={column.key} scope="col" className="whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#809581]">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-[#edf1eb] bg-white">{rows.map(row => <tr key={row.id} className="transition-colors hover:bg-[#fbfdf9]">{columns.map(column => <td key={column.key} className="whitespace-nowrap px-4 py-4 text-sm text-[#5f7465]">{column.render(row)}</td>)}</tr>)}</tbody></table></div>;
}
