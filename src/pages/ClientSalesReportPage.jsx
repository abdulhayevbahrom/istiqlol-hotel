import { useMemo, useState } from "react";
import { Alert, DatePicker, Input, Pagination, Select, Spin } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/uz";
import { FiArrowDownLeft, FiArrowUpRight, FiCreditCard } from "react-icons/fi";
import { useGetClientSalesReportQuery } from "../store/employeeApi";
import "./reports.css";

dayjs.locale("uz");
const { RangePicker } = DatePicker;
const CLIENT_SALES_PAGE_SIZE = 30;

const formatMoney = (value) => Number(value || 0).toLocaleString("uz-UZ");

const paymentTypeLabels = {
  all: "Barchasi",
  naqd: "Naqd",
  bank: "Bank o'tkazmasi",
  karta: "Karta",
  click: "Click",
};

const clientTypeLabels = {
  all: "Barchasi",
  guest: "Oddiy mehmon",
  organization: "Tashkilot",
  group: "Guruh",
};

function ClientSalesReportPage() {
  const [salesMode, setSalesMode] = useState("month");
  const [salesMonth, setSalesMonth] = useState(() => dayjs().startOf("month"));
  const [salesRange, setSalesRange] = useState(() => [
    dayjs().startOf("month"),
    dayjs(),
  ]);
  const [salesType, setSalesType] = useState("");
  const [salesQuery, setSalesQuery] = useState("");
  const [clientType, setClientType] = useState("");
  const [page, setPage] = useState(1);

  const salesParams = useMemo(() => {
    if (salesMode === "range" && salesRange?.[0] && salesRange?.[1]) {
      return {
        from: salesRange[0].format("YYYY-MM-DD"),
        to: salesRange[1].format("YYYY-MM-DD"),
        type: salesType,
        query: salesQuery,
        clientType,
        page,
        limit: CLIENT_SALES_PAGE_SIZE,
      };
    }
    return {
      month: salesMonth.format("YYYY-MM"),
      type: salesType,
      query: salesQuery,
      clientType,
      page,
      limit: CLIENT_SALES_PAGE_SIZE,
    };
  }, [salesMode, salesMonth, salesRange, salesType, salesQuery, clientType, page]);

  const {
    data: salesResponse,
    isFetching,
    error,
  } = useGetClientSalesReportQuery(salesParams);

  const salesReport = salesResponse?.innerData || {};
  const salesTotals = salesReport?.totals || {};
  const salesItems = salesReport?.items || [];
  const pagination = salesReport?.pagination || {
    page: 1,
    total: 0,
    limit: CLIENT_SALES_PAGE_SIZE,
  };

  const resetPage = () => setPage(1);

  return (
    <div className="reports-page">
      <div className="page-card reports-shell client-sales-page-shell">
        <div className="client-sales-tab">
          <div className="client-sales-toolbar">
            <div className="client-sales-filters">
              <div className="client-sales-mode-buttons">
                <button
                  type="button"
                  className={salesMode === "month" ? "active" : ""}
                  onClick={() => {
                    setSalesMode("month");
                    resetPage();
                  }}
                >
                  Oy bo'yicha
                </button>
                <button
                  type="button"
                  className={salesMode === "range" ? "active" : ""}
                  onClick={() => {
                    setSalesMode("range");
                    resetPage();
                  }}
                >
                  Sana oralig'i
                </button>
              </div>
              {salesMode === "month" ? (
                <DatePicker
                  picker="month"
                  allowClear={false}
                  value={salesMonth}
                  onChange={(value) => {
                    if (!value) return;
                    setSalesMonth(value.startOf("month"));
                    resetPage();
                  }}
                  format="MMMM YYYY"
                />
              ) : (
                <RangePicker
                  allowClear={false}
                  value={salesRange}
                  onChange={(value) => {
                    if (!value) return;
                    setSalesRange(value);
                    resetPage();
                  }}
                  format="DD.MM.YYYY"
                />
              )}
              <Select
                value={salesType}
                onChange={(value) => {
                  setSalesType(value);
                  resetPage();
                }}
                options={[
                  { label: "Barcha to'lovlar", value: "" },
                  { label: "Faqat naqd", value: "naqd" },
                  { label: "Faqat bank", value: "bank" },
                  { label: "Faqat karta", value: "karta" },
                  { label: "Faqat Click", value: "click" },
                ]}
              />
              <Select
                value={clientType}
                onChange={(value) => {
                  setClientType(value);
                  resetPage();
                }}
                options={[
                  { label: "Hamma mijozlar", value: "" },
                  { label: "Oddiy mehmon", value: "guest" },
                  { label: "Tashkilot", value: "organization" },
                  { label: "Guruh", value: "group" },
                ]}
              />
              <Input
                allowClear
                placeholder="Mijoz yoki tashkilot nomi"
                value={salesQuery}
                onChange={(event) => {
                  setSalesQuery(event.target.value);
                  resetPage();
                }}
              />
            </div>
          </div>

          {error ? (
            <Alert
              type="error"
              showIcon
              message="Mijozlar savdo hisobotini olishda xatolik yuz berdi"
            />
          ) : null}

          <Spin spinning={isFetching} tip="Hisobot yuklanmoqda...">
            <div className="client-sales-summary">
              {[
                ["Jami savdo", salesTotals.total, salesTotals.count],
                [
                  "Naqd",
                  salesTotals.byType?.naqd?.amount,
                  salesTotals.byType?.naqd?.count,
                ],
                [
                  "Bank o'tkazmasi",
                  salesTotals.byType?.bank?.amount,
                  salesTotals.byType?.bank?.count,
                ],
                [
                  "Karta / Click",
                  Number(salesTotals.byType?.karta?.amount || 0) +
                    Number(salesTotals.byType?.click?.amount || 0),
                  Number(salesTotals.byType?.karta?.count || 0) +
                    Number(salesTotals.byType?.click?.count || 0),
                ],
              ].map(([title, amount, count]) => (
                <article key={title}>
                  <span>{title}</span>
                  <strong>{formatMoney(amount)}</strong>
                  <small>{Number(count || 0)} ta mijoz</small>
                </article>
              ))}
            </div>

            <div className="client-sales-table-wrap">
              <div className="client-sales-table-head">
                <strong>
                  <FiCreditCard size={16} /> Savdolar ro'yxati
                </strong>
                <span>
                  {paymentTypeLabels[salesReport.type] || "Barchasi"} ·{" "}
                  {salesReport.range?.label || "-"}
                </span>
              </div>
              <table className="table client-sales-table">
                <thead>
                  <tr>
                    <th>check-in / out</th>
                    <th>Mijoz</th>
                    <th>Tashkilot</th>
                    <th>Mijoz turi</th>
                    <th>Xona</th>
                    <th>To'lov turi</th>
                    <th>Savdo</th>
                    <th>To'langan</th>
                    <th>Qarz</th>
                    <th>Izoh</th>
                  </tr>
                </thead>
                <tbody>
                  {salesItems.map((item, index) => (
                    <tr key={`${item.guestId}-${item.createdAt}-${index}`}>
                      <td>
                        <div className="client-sales-stay-dates">
                          <span className="client-sales-stay-date checkin">
                            <FiArrowDownLeft size={14} />
                            <b>
                              {item.checkInAt
                                ? dayjs(item.checkInAt).format("DD.MM.YYYY HH:mm")
                                : "-"}
                            </b>
                          </span>
                          <span className="client-sales-stay-date checkout">
                            <FiArrowUpRight size={14} />
                            <b>
                              {item.checkOutAt
                                ? dayjs(item.checkOutAt).format("DD.MM.YYYY HH:mm")
                                : "-"}
                            </b>
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong>{item.fullName || "-"}</strong>
                        <small>{item.passport || ""}</small>
                      </td>
                      <td>{item.organization || "-"}</td>
                      <td>
                        <span className={`client-sales-customer type-${item.clientType}`}>
                          {item.clientType === "group" && item.groupName
                            ? `${clientTypeLabels[item.clientType]}: ${item.groupName}`
                            : clientTypeLabels[item.clientType] || "-"}
                        </span>
                      </td>
                      <td>
                        {item.roomNumber || "-"}
                        {item.korpus ? ` / ${item.korpus}` : ""}
                      </td>
                      <td>
                        <span className={`client-sales-type type-${item.type}`}>
                          {paymentTypeLabels[item.type] || item.type || "-"}
                        </span>
                      </td>
                      <td>
                        <strong>{formatMoney(item.amount)}</strong>
                      </td>
                      <td>
                        <strong>{formatMoney(item.paidAmount)}</strong>
                      </td>
                      <td>
                        <strong>{formatMoney(item.debtAmount)}</strong>
                      </td>
                      <td>{item.note || "-"}</td>
                    </tr>
                  ))}
                  {!salesItems.length ? (
                    <tr>
                      <td colSpan={10} className="client-sales-empty">
                        Tanlangan davr uchun savdo topilmadi
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {Number(pagination.total || 0) > CLIENT_SALES_PAGE_SIZE ? (
              <div className="client-sales-pagination">
                <Pagination
                  current={pagination.page || page}
                  total={pagination.total || 0}
                  pageSize={pagination.limit || CLIENT_SALES_PAGE_SIZE}
                  showSizeChanger={false}
                  onChange={setPage}
                />
              </div>
            ) : null}
          </Spin>
        </div>
      </div>
    </div>
  );
}

export default ClientSalesReportPage;
