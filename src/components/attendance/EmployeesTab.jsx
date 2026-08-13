import { Button, Popconfirm, Table, Tag } from "antd";
import { RosarySpinner } from "../PageLoader";

function EmployeesTab({
  employees,
  loading,
  deleting,
  onRefresh,
  onCreate,
  onEdit,
  onDelete,
  onStats,
}) {
  const columns = [
    {
      title: "F.I.SH",
      dataIndex: "fullName",
      key: "fullName",
      render: (value) => <b>{value}</b>,
    },
    {
      title: "Kod",
      dataIndex: "employeeCode",
      key: "employeeCode",
    },
    {
      title: "Bo'lim",
      dataIndex: "departmentName",
      key: "departmentName",
      render: (value) => <Tag color="blue">{value || "-"}</Tag>,
    },
    {
      title: "Amallar",
      key: "actions",
      width: 300,
      render: (_, item) => (
        <div className="row-actions">
          <Button size="small" onClick={() => onStats(item)}>
            Ishlagan vaqti
          </Button>
          <Button size="small" onClick={() => onEdit(item)}>
            Tahrirlash
          </Button>
          <Popconfirm
            title="Hodimni o'chirish"
            description="Rostdan ham o'chirmoqchimisiz?"
            okText="O'chirish"
            cancelText="Bekor"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={() => onDelete(item.id)}
            overlayClassName="hotel-popconfirm"
          >
            <Button size="small" danger>
              O'chirish
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];
  const tableLoading = {
    spinning: loading,
    indicator: <RosarySpinner compact />,
  };

  return (
    <>
      <div className="table-toolbar">
        <h2>Davomat hodimlari</h2>
        <div className="toolbar-actions">
          <Button onClick={onRefresh}>Yangilash</Button>
          <Button className="hotel-primary-btn" onClick={onCreate}>
            Yangi hodim
          </Button>
        </div>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={employees}
        loading={tableLoading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />
    </>
  );
}

export default EmployeesTab;
