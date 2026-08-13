import { Button, Divider, Table, Tabs } from "antd";
import { formatDateTime } from "./utils";
import { RosarySpinner } from "../PageLoader";

function AttendancesTab({
  presentAttendances,
  lateAttendances,
  absentAttendances,
  loading,
  onRefresh,
  orgSummary,
}) {
  const columns = [
    {
      title: "F.I.SH",
      dataIndex: ["employee", "fullName"],
      key: "fullName",
      render: (value) => <b>{value}</b>,
    },
    {
      title: "Kod",
      dataIndex: ["employee", "employeeCode"],
      key: "employeeCode",
    },
    {
      title: "Sana",
      dataIndex: "date",
      key: "date",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Kirish",
      dataIndex: "checkInAt",
      key: "checkInAt",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Chiqish",
      dataIndex: "checkOutAt",
      key: "checkOutAt",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Ish vaqti",
      dataIndex: "workedTime",
      key: "workedTime",
      render: (value) => value || "-",
    },
    {
      title: "Kechikish",
      dataIndex: "lateMinutes",
      key: "lateMinutes",
      render: (value) => `${value} daqiqa`,
    },
    {
      title: "Erta ketish",
      dataIndex: "earlyLeaveMinutes",
      key: "earlyLeaveMinutes",
      render: (value) => `${value} daqiqa`,
    },
  ];

  const commonTableProps = {
    rowKey: (item) =>
      `${item.employee?._id || item._id || "row"}-${item.date || "date"}`,
    loading: {
      spinning: loading,
      indicator: <RosarySpinner compact />,
    },
    pagination: { pageSize: 10, showSizeChanger: false },
  };

  const absentColumns = columns.filter(
    (column) => column.key !== "checkInAt" && column.key !== "checkOutAt",
  );

  return (
    <>
      <div className="rooms-grid" style={{ marginBottom: 12 }}>
        <div className="room-card room-card-bosh" style={{ padding: 12 }}>
          <b>Jami hodim</b>
          <div>{Number(orgSummary?.totalEmployees || 0)}</div>
        </div>
        <div className="room-card room-card-bosh" style={{ padding: 12 }}>
          <b>Kelgan</b>
          <div>{Number(orgSummary?.presentCount || 0)}</div>
        </div>
        <div className="room-card room-card-bosh" style={{ padding: 12 }}>
          <b>Kechikkan</b>
          <div>{Number(orgSummary?.lateCount || 0)}</div>
        </div>
        <div className="room-card room-card-bosh" style={{ padding: 12 }}>
          <b>Kelmagan</b>
          <div>{Number(orgSummary?.absentCount || 0)}</div>
        </div>
      </div>
      <div className="table-toolbar">
        <h2>Davomatlar</h2>
        <div className="toolbar-actions">
          <Button onClick={onRefresh}>Yangilash</Button>
        </div>
      </div>
      <Divider style={{ margin: "12px 0" }} />
      <Tabs
        items={[
          {
            key: "present",
            label: `Kelgan (${presentAttendances.length})`,
            children: (
              <Table
                {...commonTableProps}
                columns={columns}
                dataSource={presentAttendances}
              />
            ),
          },
          {
            key: "late",
            label: `Kechikkan (${lateAttendances.length})`,
            children: (
              <Table
                {...commonTableProps}
                columns={columns}
                dataSource={lateAttendances}
              />
            ),
          },
          {
            key: "absent",
            label: `Kelmagan (${absentAttendances.length})`,
            children: (
              <Table
                {...commonTableProps}
                columns={absentColumns}
                dataSource={absentAttendances}
              />
            ),
          },
        ]}
      />
    </>
  );
}

export default AttendancesTab;
