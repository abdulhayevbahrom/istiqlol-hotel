import { DatePicker, Input, Pagination, Select, Table, Tag } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import PageLoader from "../components/PageLoader";
import { useGetAuditLogsQuery } from "../store/employeeApi";
import "./auditLogs.css";

const { RangePicker } = DatePicker;

const actionLabels = {
  BOOKING_CREATED: "Bron qo'shildi",
  BOOKING_BULK_CREATED: "Bronlar qo'shildi",
  BOOKING_ACTIVATED: "Bron aktiv qilindi",
  BOOKING_CANCELLED: "Bron bekor qilindi",
  GUEST_CHECKED_IN: "Mehmon qabul qilindi",
  GUEST_BULK_CHECKED_IN: "Mehmonlar qabul qilindi",
  GROUP_BOOKING_CREATED: "Guruh bron qilindi",
  GROUP_BOOKING_UPDATED: "Guruh bron o'zgartirildi",
  GROUP_BOOKING_DELETED: "Guruh bron o'chirildi",
  GROUP_PAYMENT_ADDED: "Guruh to'lovi qo'shildi",
  USER_LOGIN: "Tizimga kirdi",
  USER_LOGOUT: "Tizimdan chiqdi",
  BOOKING_UPDATED: "Bron o'zgartirildi",
  BOOKING_DELETED: "Bron o'chirildi",
  GUEST_UPDATED: "Mehmon o'zgartirildi",
  GUEST_DELETED: "Mehmon o'chirildi",
  GUEST_CHECKED_OUT: "Checkout qilindi",
  GUEST_BULK_CHECKED_OUT: "Bulk checkout",
  GUEST_STAY_CONTINUED: "Yashash davom ettirildi",
  PAYMENT_ADDED: "To'lov qo'shildi",
  PAYMENT_UPDATED: "To'lov o'zgartirildi",
  ROOM_CREATED: "Xona qo'shildi",
  ROOM_UPDATED: "Xona o'zgartirildi",
  ROOM_PRICE_UPDATED: "Xona narxi o'zgartirildi",
  ROOM_DELETED: "Xona o'chirildi",
  EMPLOYEE_CREATED: "Hodim qo'shildi",
  EMPLOYEE_UPDATED: "Hodim o'zgartirildi",
  EMPLOYEE_DELETED: "Hodim o'chirildi",
  SETTINGS_UPDATED: "Sozlamalar o'zgartirildi",
  RECEIPT_CREATED: "Kvitansiya yaratildi",
  RECEIPT_UPDATED: "Kvitansiya o'zgartirildi",
  RECEIPT_DELETED: "Kvitansiya o'chirildi",
  EXPENSE_CREATED: "Xarajat qo'shildi",
  EXPENSE_UPDATED: "Xarajat o'zgartirildi",
  EXPENSE_DELETED: "Xarajat o'chirildi",
  EXPENSE_BULK_DELETED: "Xarajatlar o'chirildi",
  SERVICE_CREATED: "Xizmat qo'shildi",
  SERVICE_UPDATED: "Xizmat o'zgartirildi",
  SERVICE_DELETED: "Xizmat o'chirildi",
  HALL_BOOKING_CREATED: "Zal bron qilindi",
  HALL_BOOKING_UPDATED: "Zal bron o'zgartirildi",
  HALL_BOOKING_CANCELLED: "Zal bron bekor qilindi",
  HALL_BOOKING_DELETED: "Zal bron o'chirildi",
  HALL_PAYMENT_ADDED: "Zal to'lovi qo'shildi",
  GUEST_SERVICE_ADDED: "Mehmonga xizmat qo'shildi",
  VIP_APPROVED: "VIP tasdiqlandi",
  VIP_REJECTED: "VIP rad etildi",
};

const actionColors = {
  BOOKING_CREATED: "blue",
  BOOKING_BULK_CREATED: "blue",
  BOOKING_ACTIVATED: "green",
  BOOKING_CANCELLED: "red",
  GUEST_CHECKED_IN: "green",
  GUEST_BULK_CHECKED_IN: "green",
  GROUP_BOOKING_CREATED: "purple",
  GROUP_BOOKING_UPDATED: "purple",
  GROUP_BOOKING_DELETED: "red",
  GROUP_PAYMENT_ADDED: "cyan",
  USER_LOGIN: "green",
  USER_LOGOUT: "default",
  BOOKING_UPDATED: "orange",
  BOOKING_DELETED: "red",
  GUEST_UPDATED: "orange",
  GUEST_DELETED: "red",
  GUEST_CHECKED_OUT: "geekblue",
  GUEST_BULK_CHECKED_OUT: "geekblue",
  GUEST_STAY_CONTINUED: "green",
  PAYMENT_ADDED: "cyan",
  PAYMENT_UPDATED: "cyan",
  ROOM_CREATED: "blue",
  ROOM_UPDATED: "orange",
  ROOM_PRICE_UPDATED: "gold",
  ROOM_DELETED: "red",
  EMPLOYEE_CREATED: "blue",
  EMPLOYEE_UPDATED: "orange",
  EMPLOYEE_DELETED: "red",
  SETTINGS_UPDATED: "volcano",
  RECEIPT_CREATED: "blue",
  RECEIPT_UPDATED: "orange",
  RECEIPT_DELETED: "red",
  EXPENSE_CREATED: "blue",
  EXPENSE_UPDATED: "orange",
  EXPENSE_DELETED: "red",
  EXPENSE_BULK_DELETED: "red",
  SERVICE_CREATED: "blue",
  SERVICE_UPDATED: "orange",
  SERVICE_DELETED: "red",
  HALL_BOOKING_CREATED: "purple",
  HALL_BOOKING_UPDATED: "purple",
  HALL_BOOKING_CANCELLED: "red",
  HALL_BOOKING_DELETED: "red",
  HALL_PAYMENT_ADDED: "cyan",
  GUEST_SERVICE_ADDED: "lime",
  VIP_APPROVED: "green",
  VIP_REJECTED: "red",
};

const formatActor = (actor) => {
  const fullName = `${actor?.firstname || ""} ${actor?.lastname || ""}`.trim();
  return fullName || actor?.login || "-";
};

const formatDate = (value) =>
  value ? dayjs(value).format("DD.MM.YYYY HH:mm") : "-";

const shortId = (value) => {
  const text = String(value || "");
  if (text.length <= 10) return text || "-";
  return `${text.slice(0, 8)}...${text.slice(-4)}`;
};

const fieldLabels = {
  firstname: "Ism",
  lastname: "Familiya",
  passport: "Pasport",
  phone: "Telefon",
  email: "Email",
  organization: "Tashkilot",
  room: "Xona",
  guestType: "Mehmon turi",
  rooms: "Xonalar",
  status: "Holat",
  bookedForAt: "Bron sanasi",
  checkInAt: "Kirish vaqti",
  checkOutAt: "Chiqish vaqti",
  checkoutDueAt: "Chiqish muddati",
  stayDays: "Yashash kunlari",
  billableDays: "Hisob kunlari",
  dailyRate: "Kunlik narx",
  dailyRates: "Kunlik narxlar",
  totalAmount: "Jami summa",
  paidAmount: "To'langan summa",
  debtAmount: "Qarzdorlik",
  source: "Manba",
  note: "Izoh",
  isBlacklisted: "Qora ro'yxat",
  group: "Guruh",
  prices: "Narxlar",
  capacity: "Sig'im",
  category: "Toifa",
  paymentType: "To'lov turi",
  mainPaymentType: "Asosiy to'lov turi",
  defaultPrice: "Standart narx",
  isActive: "Faol",
  startDate: "Boshlanish sanasi",
  endDate: "Tugash sanasi",
  receiptNumber: "Kvitansiya raqami",
};

const ignoredDiffFields = new Set(["_id", "id", "__v", "createdAt", "updatedAt"]);

const valuesEqual = (left, right) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const getItemChanges = (item) => {
  const supplied = item?.changes && typeof item.changes === "object" ? item.changes : null;
  const candidates =
    item?.before && item?.after && !Array.isArray(item.before) && !Array.isArray(item.after)
      ? [...new Set([...Object.keys(item.before), ...Object.keys(item.after)])].reduce(
          (result, key) => {
            if (!ignoredDiffFields.has(key)) {
              result[key] = { from: item.before[key], to: item.after[key] };
            }
            return result;
          },
          {},
        )
      : {};

  if (supplied) Object.assign(candidates, supplied);

  return Object.entries(candidates).filter(([field, change]) => {
    if (valuesEqual(change?.from, change?.to)) return false;

    // Eski mehmon loglarida tizim avtomatik hisoblagan sanalar ham saqlangan.
    // Ular tahrirlash oynasida hodim o'zgartirgan alohida maydonlar emas.
    if (item?.action === "GUEST_UPDATED" && field === "checkoutDueAt") return false;
    if (
      item?.action === "GUEST_UPDATED" &&
      field === "checkOutAt" &&
      item?.before?.status !== "checked_out" &&
      item?.after?.status !== "checked_out"
    ) return false;

    return true;
  });
};

const statusLabels = {
  booked: "Bron qilingan",
  active: "Faol",
  completed: "Yakunlangan",
  cancelled: "Bekor qilingan",
  available: "Bo'sh",
  occupied: "Band",
};

const formatValue = (value, field) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ha" : "Yo'q";
  if (field === "status" && statusLabels[value]) return statusLabels[value];
  if (/At$|Date$/.test(field) && dayjs(value).isValid()) {
    return dayjs(value).format("DD.MM.YYYY HH:mm");
  }
  if (Array.isArray(value)) return value.length ? value.map((item) => formatValue(item, "")).join(", ") : "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const ChangesDetails = ({ item }) => {
  const changes = getItemChanges(item);
  if (!changes.length) return <div className="audit-no-changes">O'zgarish tafsilotlari saqlanmagan.</div>;

  return (
    <div className="audit-changes">
      <div className="audit-changes-title">O'zgargan ma'lumotlar</div>
      <div className="audit-changes-grid audit-changes-head">
        <span>Maydon</span><span>Eski qiymat</span><span>Yangi qiymat</span>
      </div>
      {changes.map(([field, change]) => (
        <div className="audit-changes-grid" key={field}>
          <strong>{fieldLabels[field] || field}</strong>
          <span className="audit-old-value">{formatValue(change?.from, field)}</span>
          <span className="audit-new-value">{formatValue(change?.to, field)}</span>
        </div>
      ))}
    </div>
  );
};

function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    query: "",
    action: "",
    entity: "",
    from: "",
    to: "",
  });

  const { data, isLoading } = useGetAuditLogsQuery({
    page,
    limit: 30,
    ...filters,
  });

  const payload = data?.innerData || {};
  const items = payload.items || [];
  const pagination = payload.pagination || { total: 0, page: 1, limit: 30 };

  const actionOptions = useMemo(
    () =>
      (payload.actions || []).map((action) => ({
        label: actionLabels[action] || action,
        value: action,
      })),
    [payload.actions],
  );
  const entityOptions = useMemo(
    () =>
      (payload.entities || []).map((entity) => ({
        label: entity,
        value: entity,
      })),
    [payload.entities],
  );

  const columns = [
    {
      title: "Vaqt",
      dataIndex: "createdAt",
      width: 145,
      render: formatDate,
    },
    {
      title: "Kim",
      dataIndex: "actor",
      width: 180,
      render: (actor) => (
        <div className="audit-cell-stack">
          <strong title={formatActor(actor)}>{formatActor(actor)}</strong>
          <span className="audit-muted">{actor?.role || ""}</span>
        </div>
      ),
    },
    {
      title: "Amal",
      dataIndex: "action",
      width: 170,
      render: (action) => (
        <Tag color={actionColors[action] || "default"}>
          {actionLabels[action] || action}
        </Tag>
      ),
    },
    {
      title: "Obyekt",
      width: 145,
      render: (_, item) => (
        <div className="audit-cell-stack">
          <strong>{item.entity}</strong>
          <span className="audit-muted" title={item.entityId || ""}>
            {shortId(item.entityId)}
          </span>
        </div>
      ),
    },
    {
      title: "Izoh",
      dataIndex: "description",
      render: (value, item) => (
        <div className="audit-description">
          <span title={value || ""}>{value || "-"}</span>
          {item.meta?.roomNumber ? (
            <span className="audit-muted">Xona: {item.meta.roomNumber}</span>
          ) : null}
        </div>
      ),
    },
    {
      title: "O'zgarish",
      width: 115,
      render: (_, item) => {
        const count = getItemChanges(item).length;
        return count ? <Tag color="gold">{count} ta maydon</Tag> : <span className="audit-muted">—</span>;
      },
    },
    {
      title: "IP",
      dataIndex: "ip",
      width: 105,
      render: (value) => <span title={value || ""}>{value || "-"}</span>,
    },
  ];

  return (
    <div className="audit-page">
      <div className="audit-header">
        <div>
          <h1>Audit log</h1>
          <p>Bron qo'shish, aktiv qilish va bekor qilish tarixi.</p>
        </div>
      </div>

      <div className="audit-toolbar">
        <Input.Search
          allowClear
          placeholder="Qidirish"
          onSearch={(value) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, query: value.trim() }));
          }}
        />
        <Select
          allowClear
          placeholder="Amal"
          options={actionOptions}
          onChange={(value) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, action: value || "" }));
          }}
        />
        <Select
          allowClear
          placeholder="Obyekt"
          options={entityOptions}
          onChange={(value) => {
            setPage(1);
            setFilters((prev) => ({ ...prev, entity: value || "" }));
          }}
        />
        <RangePicker
          format="DD.MM.YYYY"
          onChange={(dates) => {
            setPage(1);
            setFilters((prev) => ({
              ...prev,
              from: dates?.[0]?.startOf("day").toISOString() || "",
              to: dates?.[1]?.endOf("day").toISOString() || "",
            }));
          }}
        />
      </div>

      {isLoading ? (
        <PageLoader />
      ) : (
        <>
          <div className="table-wrap audit-table-wrap">
            <Table
              rowKey="_id"
              className="audit-table"
              size="small"
              columns={columns}
              dataSource={items}
              pagination={false}
              expandable={{
                expandedRowRender: (item) => <ChangesDetails item={item} />,
                rowExpandable: (item) => getItemChanges(item).length > 0,
                expandRowByClick: true,
                columnWidth: 42,
              }}
              scroll={{ x: 1100 }}
            />
          </div>
          <div className="audit-pagination">
            <Pagination
              current={pagination.page}
              pageSize={pagination.limit}
              total={pagination.total}
              onChange={setPage}
              showSizeChanger={false}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default AuditLogsPage;
