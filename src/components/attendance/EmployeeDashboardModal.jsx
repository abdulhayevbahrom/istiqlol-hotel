import { Button, InputNumber, Modal, Table } from "antd";
import { formatDateTime } from "./utils";
import { RosarySpinner } from "../PageLoader";

function EmployeeDashboardModal({
  open,
  employee,
  year,
  month,
  onYearChange,
  onMonthChange,
  onClose,
  onRefresh,
  loading,
  summary,
  dailyDetails,
}) {
  const columns = [
    {
      title: "Sana",
      dataIndex: "date",
      key: "date",
      render: (value) => formatDateTime(value),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => value || "-",
    },
    {
      title: "Ishlagan vaqt",
      dataIndex: "workedTime",
      key: "workedTime",
      render: (value) => value || "-",
    },
    {
      title: "Kechikish",
      dataIndex: "lateMinutes",
      key: "lateMinutes",
      render: (value) => `${Number(value || 0)} daqiqa`,
    },
    {
      title: "Erta ketish",
      dataIndex: "earlyLeaveMinutes",
      key: "earlyLeaveMinutes",
      render: (value) => `${Number(value || 0)} daqiqa`,
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnHidden
      title={`${employee?.fullName || "Hodim"} - ishlagan vaqt`}
      rootClassName="employee-modal-theme"
    >
      <div className="table-toolbar">
        <div className="toolbar-actions">
          <InputNumber
            min={2020}
            max={2100}
            precision={0}
            value={year}
            onChange={(v) => onYearChange(Number(v || year))}
            placeholder="Yil"
          />
          <InputNumber
            min={1}
            max={12}
            precision={0}
            value={month}
            onChange={(v) => onMonthChange(Number(v || month))}
            placeholder="Oy"
          />
          <Button onClick={onRefresh}>Yangilash</Button>
        </div>
      </div>

      <div className="rooms-grid" style={{ marginBottom: 12 }}>
        <div className="room-card room-card-bosh" style={{ padding: 12 }}>
          <b>Present kunlar</b>
          <div>{Number(summary?.presentDays || 0)}</div>
        </div>
        <div className="room-card room-card-bosh" style={{ padding: 12 }}>
          <b>Kechikkan kunlar</b>
          <div>{Number(summary?.lateDays || 0)}</div>
        </div>
        <div className="room-card room-card-bosh" style={{ padding: 12 }}>
          <b>Ishlagan vaqt</b>
          <div>{summary?.totalWorkedTime || "0 soat 0 minut"}</div>
        </div>
        <div className="room-card room-card-bosh" style={{ padding: 12 }}>
          <b>Kechikish vaqti</b>
          <div>{summary?.totalLateTime || "0 soat 0 minut"}</div>
        </div>
      </div>

      <Table
        rowKey={(item) => `${item?.date || "day"}-${item?.status || "status"}`}
        columns={columns}
        dataSource={dailyDetails}
        loading={{
          spinning: loading,
          indicator: <RosarySpinner compact />,
        }}
        pagination={{ pageSize: 15, showSizeChanger: false }}
      />
    </Modal>
  );
}

export default EmployeeDashboardModal;
