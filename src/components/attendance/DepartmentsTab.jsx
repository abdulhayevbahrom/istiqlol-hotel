import { Button, Popconfirm, Table, Tag } from "antd";
import { RosarySpinner } from "../PageLoader";

function DepartmentsTab({
  departments,
  loading,
  deleting,
  onRefresh,
  onCreate,
  onEdit,
  onDelete,
}) {
  const columns = [
    {
      title: "Nomi",
      dataIndex: "name",
      key: "name",
      render: (value) => <b>{value}</b>,
    },
    {
      title: "Ish vaqti",
      key: "time",
      render: (_, item) => (
        <Tag color="gold">
          {item.checkInTime} - {item.checkOutTime}
        </Tag>
      ),
    },
    {
      title: "Kechikish",
      dataIndex: "lateAfterMinutes",
      key: "lateAfterMinutes",
      render: (value) => `${value} daqiqa`,
    },
    {
      title: "Erta ketish",
      dataIndex: "earlyLeaveMinutes",
      key: "earlyLeaveMinutes",
      render: (value) => `${value} daqiqa`,
    },
    {
      title: "Amallar",
      key: "actions",
      width: 220,
      render: (_, item) => (
        <div className="row-actions">
          <Button size="small" onClick={() => onEdit(item)}>
            Tahrirlash
          </Button>
          <Popconfirm
            title="Bo'limni o'chirish"
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
        <h2>Davomat bo'limlari</h2>
        <div className="toolbar-actions">
          <Button onClick={onRefresh}>Yangilash</Button>
          <Button className="hotel-primary-btn" onClick={onCreate}>
            Yangi bo'lim
          </Button>
        </div>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={departments}
        loading={tableLoading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />
    </>
  );
}

export default DepartmentsTab;
