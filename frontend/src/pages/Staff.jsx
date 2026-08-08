import CrudResource from "@/components/CrudResource";
import { fmtDate } from "@/lib/api";

export default function Staff() {
  return (
    <CrudResource
      title="Karyawan"
      subtitle="Kelola akun & data karyawan"
      endpoint="/staff"
      searchable={false}
      columns={[
        { key: "name", label: "Nama" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role", render: (r) => <span className="capitalize">{r.role}</span> },
        { key: "created_at", label: "Dibuat", render: (r) => fmtDate(r.created_at) },
      ]}
      fields={[
        { name: "name", label: "Nama", required: true, full: true },
        { name: "email", label: "Email", required: true },
        { name: "password", label: "Password", required: true },
        { name: "role", label: "Role", type: "select", default: "kasir",
          options: [{ value: "owner", label: "Owner" }, { value: "kasir", label: "Kasir" }, { value: "staf", label: "Staf" }] },
      ]}
    />
  );
}
