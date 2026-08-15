import { memo, useMemo, useRef, useState } from "react";
import { Alert, Button, DatePicker, Modal, Spin } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/uz";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import {
  FiActivity,
  FiBarChart2,
  FiClipboard,
  FiDollarSign,
  FiFileText,
  FiGrid,
  FiPrinter,
  FiShield,
  FiStar,
  FiUsers,
} from "react-icons/fi";
import PageLoader from "../components/PageLoader";
import {
  useGetDailyReportQuery,
  useGetReportsSummaryQuery,
} from "../store/employeeApi";
import "./reports.css";

dayjs.locale("uz");

const formatMoney = (value) => Number(value || 0).toLocaleString("uz-UZ");

const formatCompactMoney = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000)
    return `${(amount / 1_000_000_000).toFixed(1)} mlrd`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} mln`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)} ming`;
  return `${Math.round(amount)}`;
};

const PAYMENT_TYPE_LABELS = {
  naqd: "Naqd",
  karta: "Karta",
  click: "Click",
  bank: "O'tkazma",
};

const REPORT_DESTINATIONS = {
  "finance.paymentRegistry": "/guests-history",
  "finance.roomRevenue": "/rooms",
  "finance.categoryRevenue": "/rooms",
  "finance.profitLoss": "/expenses",
  "finance.expenseBreakdown": "/expenses",
  "operations.occupancyHistory": "/rooms",
  "operations.bookings": "/guests-active",
  "operations.checkoutDelays": "/guests-debtors",
  "operations.hallBookings": "/hall-bookings",
  "guests.guestFlow": "/guests-history",
  "guests.debtAging": "/guests-debtors",
  "guests.vipGuests": "/guests-active",
  "guests.blacklist": "/guests-history",
  "guests.loyalGuests": "/guests-history",
  "extra.servicesRevenue": "/services",
  "extra.employeeActivity": "/employees",
};

const HIGHLIGHT_DESTINATIONS = {
  "To'lovlar markazi": "/guests-history",
  "Sof natija": "/expenses",
  "Qarzdor nazorati": "/guests-debtors",
  "Xizmatlar oqimi": "/services",
};

const createNavigateProps = (navigate, path, label) => ({
  role: "button",
  tabIndex: 0,
  "aria-label": label,
  onClick: () => navigate(path),
  onKeyDown: (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(path);
    }
  },
});

const reportGroups = [
  {
    title: "Pul hisoboti",
    accent: "finance",
    icon: FiDollarSign,
    items: [
      {
        key: "finance.paymentRegistry",
        title: "To'lovlar ro'yxati",
        text: "Qaysi mijoz qachon va qancha to'lov qilganini ko'rsatadi.",
      },
      {
        key: "finance.roomRevenue",
        title: "Xonalar daromadi",
        text: "Qaysi xona ko'proq pul olib kelganini ko'rsatadi.",
      },
      {
        key: "finance.categoryRevenue",
        title: "Xona turlari daromadi",
        text: "Standart, lyuks va boshqa turdagi xonalar daromadini ko'rsatadi.",
      },
      {
        key: "finance.profitLoss",
        title: "Daromad va xarajat",
        text: "Qancha pul tushgani, qancha xarajat bo'lgani va qancha foyda qolgani ko'rinadi.",
      },
      {
        key: "finance.expenseBreakdown",
        title: "Xarajatlar taqsimoti",
        text: "Pul qaysi yo'nalishlarga sarflanganini ko'rsatadi.",
      },
    ],
  },
  {
    title: "Ish jarayoni",
    accent: "operations",
    icon: FiGrid,
    items: [
      {
        key: "operations.occupancyHistory",
        title: "Xonalar bandligi",
        text: "Xonalarning nechta qismi band ekanini ko'rsatadi.",
      },
      {
        key: "operations.bookings",
        title: "Bronlar soni",
        text: "Nechta bron borligini ko'rsatadi.",
      },
      {
        key: "operations.checkoutDelays",
        title: "Chiqish muddati o'tganlar",
        text: "Vaqtida chiqmagan mijozlar va ularning qarzini ko'rsatadi.",
      },
      {
        key: "operations.hallBookings",
        title: "Zal buyurtmalari",
        text: "Zal nechta marta buyurtma qilingani va qancha pul tushganini ko'rsatadi.",
      },
    ],
  },
  {
    title: "Mijozlar",
    accent: "guests",
    icon: FiUsers,
    items: [
      {
        key: "guests.guestFlow",
        title: "Kelgan va ketgan mijozlar",
        text: "Tanlangan oyda nechta mijoz kelgani va nechta mijoz ketganini ko'rsatadi.",
      },
      {
        key: "guests.debtAging",
        title: "Qarzdor mijozlar",
        text: "Qarzi bor mijozlar soni va umumiy qarz miqdorini ko'rsatadi.",
      },
      {
        key: "guests.vipGuests",
        title: "VIP mijozlar",
        text: "VIP mijozlar va VIP bo'lish uchun yuborilgan so'rovlarni ko'rsatadi.",
      },
      {
        key: "guests.blacklist",
        title: "Muammoli mijozlar",
        text: "Qora ro'yxatga tushgan mijozlar sonini ko'rsatadi.",
      },
      {
        key: "guests.loyalGuests",
        title: "Ko'p keladigan mijozlar",
        text: "Bir necha marta kelgan doimiy mijozlarni ko'rsatadi.",
      },
    ],
  },
  {
    title: "Qo'shimcha ma'lumotlar",
    accent: "extra",
    icon: FiActivity,
    items: [
      {
        key: "extra.servicesRevenue",
        title: "Xizmatlar daromadi",
        text: "Qo'shimcha xizmatlardan qancha pul tushganini ko'rsatadi.",
      },
      {
        key: "extra.employeeActivity",
        title: "Ishlayotgan hodimlar",
        text: "Hozir tizimda faol ishlayotgan hodimlar sonini ko'rsatadi.",
      },
    ],
  },
];

const getReportMetric = (key, sections = {}) => {
  const finance = sections?.finance || {};
  const operations = sections?.operations || {};
  const guests = sections?.guests || {};
  const extra = sections?.extra || {};

  switch (key) {
    case "finance.paymentRegistry":
      return {
        value: `${Number(finance?.paymentRegistry?.count || 0)} ta`,
        detail: `${formatCompactMoney(finance?.paymentRegistry?.totalAmount)} so'm`,
        meta: "Oy davomida qilingan to'lovlar",
      };
    case "finance.roomRevenue":
      return {
        value: finance?.roomRevenue?.topRoomNumber || "-",
        detail: `${formatCompactMoney(finance?.roomRevenue?.topRoomAmount)} so'm`,
        meta: `${Number(finance?.roomRevenue?.activeRoomsCount || 0)} ta xona daromad keltirgan`,
      };
    case "finance.categoryRevenue":
      return {
        value: finance?.categoryRevenue?.topCategory || "-",
        detail: `${formatCompactMoney(finance?.categoryRevenue?.topCategoryAmount)} so'm`,
        meta: `${Number(finance?.categoryRevenue?.categoriesCount || 0)} ta xona turi`,
      };
    case "finance.profitLoss":
      return {
        value: `${formatCompactMoney(finance?.profitLoss?.net)} so'm`,
        detail: `Tushum ${formatCompactMoney(finance?.profitLoss?.revenue)} | Xarajat ${formatCompactMoney(finance?.profitLoss?.expense)}`,
        meta:
          Number(finance?.profitLoss?.net || 0) >= 0
            ? "Xarajatlardan keyin qolgan foyda"
            : "Xarajatlar ko'proq bo'lgan",
      };
    case "finance.expenseBreakdown":
      return {
        value: `${formatCompactMoney(finance?.expenseBreakdown?.totalAmount)} so'm`,
        detail: `${Number(finance?.expenseBreakdown?.categoriesCount || 0)} ta yo'nalish`,
        meta: "Pul qayerlarga sarflangan",
      };
    case "operations.occupancyHistory":
      return {
        value: `${Number(operations?.occupancyHistory?.occupancyPercent || 0)}%`,
        detail: `${Number(operations?.occupancyHistory?.occupiedRooms || 0)} / ${Number(operations?.occupancyHistory?.totalRooms || 0)} xona`,
        meta: "Hozirgi bandlik holati",
      };
    case "operations.bookings":
      return {
        value: `${Number(operations?.bookings?.count || 0)} ta`,
        detail: "Tanlangan oy uchun bronlar",
        meta: "Oldindan band qilingan xonalar",
      };
    case "operations.checkoutDelays":
      return {
        value: `${Number(operations?.checkoutDelays?.count || 0)} ta`,
        detail: `${formatCompactMoney(operations?.checkoutDelays?.totalDebt)} so'm`,
        meta: "Kechikib chiqayotgan mijozlar qarzi",
      };
    case "operations.hallBookings":
      return {
        value: `${Number(operations?.hallBookings?.count || 0)} ta`,
        detail: `${formatCompactMoney(operations?.hallBookings?.totalAmount)} so'm`,
        meta: `${formatCompactMoney(operations?.hallBookings?.totalDebt)} so'm qarz`,
      };
    case "guests.guestFlow":
      return {
        value: `${Number(guests?.guestFlow?.arrived || 0)} / ${Number(guests?.guestFlow?.left || 0)}`,
        detail: "Kelgan / ketgan mijozlar",
        meta: "Oy ichidagi mijozlar harakati",
      };
    case "guests.debtAging":
      return {
        value: `${Number(guests?.debtAging?.count || 0)} ta`,
        detail: `${formatCompactMoney(guests?.debtAging?.totalDebt)} so'm`,
        meta: `${Number(guests?.debtAging?.over7Days || 0)} ta 7 kundan oshgan`,
      };
    case "guests.vipGuests":
      return {
        value: `${Number(guests?.vipGuests?.count || 0)} ta`,
        detail: `${Number(guests?.vipGuests?.pendingRequests || 0)} ta so'rov kutilmoqda`,
        meta: "Alohida kuzatiladigan mijozlar",
      };
    case "guests.blacklist":
      return {
        value: `${Number(guests?.blacklist?.count || 0)} ta`,
        detail: "Qora ro'yxatdagi mijozlar",
        meta: "Ehtiyot bo'lish kerak bo'lgan mijozlar",
      };
    case "guests.loyalGuests":
      return {
        value: `${Number(guests?.loyalGuests?.repeatGuests || 0)} ta`,
        detail: "Qayta kelgan mijozlar",
        meta: "Doimiy mijozlar soni",
      };
    case "extra.servicesRevenue":
      return {
        value: `${Number(extra?.servicesRevenue?.count || 0)} ta`,
        detail: `${formatCompactMoney(extra?.servicesRevenue?.totalAmount)} so'm`,
        meta: `${Number(extra?.servicesRevenue?.activeServices || 0)} ta faol xizmat turi`,
      };
    case "extra.employeeActivity":
      return {
        value: `${Number(extra?.employeeActivity?.activeEmployees || 0)} ta`,
        detail: "Faol hodimlar soni",
        meta: "Ishlayotgan hodimlar soni",
      };
    default:
      return {
        value: "-",
        detail: "Ma'lumot topilmadi",
        meta: "Hisobot hali tayyor emas",
      };
  }
};

function ReportsPage() {
  const navigate = useNavigate();
  const dailyReportRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    dayjs().startOf("month"),
  );
  const [dailyReportDate, setDailyReportDate] = useState(() => dayjs());
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const hotelName = localStorage.getItem("hotelName") || "GRAND HOTEL";
  const monthKey = selectedMonth.format("YYYY-MM");

  const { data, isLoading, isFetching, error } = useGetReportsSummaryQuery(
    monthKey,
    {
      refetchOnFocus: true,
      refetchOnReconnect: true,
    },
  );
  const dailyDateKey = dailyReportDate.format("YYYY-MM-DD");
  const {
    data: dailyResponse,
    isFetching: isDailyReportFetching,
    error: dailyReportError,
  } = useGetDailyReportQuery(dailyDateKey, { skip: !isDailyReportOpen });

  const reportData = data?.innerData || {};
  const sections = reportData?.sections || {};
  const dailyReport = dailyResponse?.innerData;

  const quickHighlights = useMemo(
    () => [
      {
        title: "To'lovlar markazi",
        text: `${Number(sections?.finance?.paymentRegistry?.count || 0)} ta to'lov`,
        value: `${formatCompactMoney(sections?.finance?.paymentRegistry?.totalAmount)} so'm`,
        icon: FiBarChart2,
      },
      {
        title: "Sof natija",
        text:
          Number(sections?.finance?.profitLoss?.net || 0) >= 0
            ? "Oy yakuni foydada"
            : "Oy yakuni zararda",
        value: `${formatCompactMoney(sections?.finance?.profitLoss?.net)} so'm`,
        icon: FiFileText,
      },
      {
        title: "Qarzdor nazorati",
        text: `${Number(sections?.guests?.debtAging?.over7Days || 0)} ta eski qarz`,
        value: `${formatCompactMoney(sections?.guests?.debtAging?.totalDebt)} so'm`,
        icon: FiShield,
      },
      {
        title: "Xizmatlar oqimi",
        text: `${Number(sections?.extra?.servicesRevenue?.activeServices || 0)} ta xizmat turi`,
        value: `${formatCompactMoney(sections?.extra?.servicesRevenue?.totalAmount)} so'm`,
        icon: FiStar,
      },
    ],
    [sections],
  );

  const onMonthChange = (value) => {
    if (!value) {
      setSelectedMonth(dayjs().startOf("month"));
      return;
    }
    setSelectedMonth(value.startOf("month"));
  };

  const printDailyReport = useReactToPrint({
    content: () => dailyReportRef.current,
    documentTitle: `Kunlik-hisobot-${dailyReportDate.format("YYYY-MM-DD")}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  if (isLoading && !data) {
    return (
      <PageLoader
        title="Hisobotlar tayyorlanmoqda"
        text="Backenddan analitik ma'lumotlar olinmoqda, bir oz kuting"
      />
    );
  }

  return (
    <div className="reports-page">
      <div className="page-card reports-shell">
        <section className="reports-hero">
          <div className="reports-hero-copy">
            <div className="reports-eyebrow">Hisobotlar markazi</div>
            <div className="reports-hero-head">
              <div>
                <h2>Mehmonxona bo'yicha batafsil ko'rsatkichlar</h2>
                <p>
                  Bu yerda pul tushumi, xarajatlar, bronlar va mijozlar
                  holati bitta sahifada sodda ko'rinishda chiqadi.
                </p>
              </div>

              <div className="reports-hero-actions">
                <DatePicker
                  picker="month"
                  allowClear={false}
                  value={selectedMonth}
                  onChange={onMonthChange}
                  format="MMMM YYYY"
                  className="reports-month-picker"
                />
                <div className="reports-generated-at">
                  <span>Tanlangan oy</span>
                  <strong>{reportData?.month || monthKey}</strong>
                </div>
                <Button
                  type="primary"
                  icon={<FiPrinter size={16} />}
                  className="reports-daily-button"
                  onClick={() => setIsDailyReportOpen(true)}
                >
                  Kunlik hisobot PDF
                </Button>
              </div>
            </div>
          </div>

          <div className="reports-highlights">
            {quickHighlights.map((item) => {
              const Icon = item.icon;
              const destination = HIGHLIGHT_DESTINATIONS[item.title] || "/reports";
              return (
                <article
                  key={item.title}
                  className="reports-highlight-card reports-clickable-card"
                  {...createNavigateProps(
                    navigate,
                    destination,
                    `${item.title} bo'limini ochish`,
                  )}
                >
                  <span className="reports-highlight-icon">
                    <Icon size={16} />
                  </span>
                  <strong>{item.title}</strong>
                  <div className="reports-highlight-value">{item.value}</div>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        {error ? (
          <section className="reports-footer-note">
            <span className="reports-footer-icon">
              <FiClipboard size={15} />
            </span>
            Hisobotlarni backenddan olishda xatolik yuz berdi. API javobini
            tekshirib, qayta yuklash kerak bo'ladi.
          </section>
        ) : null}

        <section className="reports-groups">
          {reportGroups.map((group) => {
            const Icon = group.icon;
            return (
              <article
                key={group.title}
                className={`reports-group-card reports-group-${group.accent}`}
              >
                <header className="reports-group-head">
                  <span className="reports-group-icon">
                    <Icon size={17} />
                  </span>
                  <div>
                    <h3>{group.title}</h3>
                    <p>{group.items.length} ta hisobot yo'nalishi</p>
                  </div>
                </header>

                <div className="reports-item-list">
                  {group.items.map((item) => {
                    const metric = getReportMetric(item.key, sections);
                    const destination = REPORT_DESTINATIONS[item.key] || "/reports";

                    return (
                      <div
                        key={item.title}
                        className="reports-item-card reports-clickable-card"
                        {...createNavigateProps(
                          navigate,
                          destination,
                          `${item.title} bo'limini ochish`,
                        )}
                      >
                        <div className="reports-item-title-row">
                          <b>{item.title}</b>
                          <div className="reports-item-badge">
                            <span className="reports-item-badge-value">
                              {isFetching ? "..." : metric.value}
                            </span>
                            <small className="reports-item-badge-detail">
                              {isFetching ? "Yangilanmoqda" : metric.detail}
                            </small>
                          </div>
                        </div>
                        <p>{item.text}</p>
                        <div className="reports-item-meta">{metric.meta}</div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>

        <section className="reports-footer-note">
          <span className="reports-footer-icon">
            <FiClipboard size={15} />
          </span>
          Jami tushum: {formatMoney(sections?.finance?.profitLoss?.revenue)} so'm.
          Jami xarajat: {formatMoney(sections?.finance?.profitLoss?.expense)} so'm.
          Yangilangan vaqt:{" "}
          {reportData?.generatedAt
            ? dayjs(reportData.generatedAt).format("DD.MM.YYYY HH:mm")
            : "-"}
          .
        </section>

        <Modal
          open={isDailyReportOpen}
          onCancel={() => setIsDailyReportOpen(false)}
          width={920}
          title="Kunlik hisobot"
          className="daily-report-modal"
          footer={[
            <Button key="close" onClick={() => setIsDailyReportOpen(false)}>
              Yopish
            </Button>,
            <Button
              key="print"
              type="primary"
              icon={<FiPrinter size={16} />}
              disabled={isDailyReportFetching || !dailyReport || Boolean(dailyReportError)}
              onClick={printDailyReport}
            >
              PDF saqlash / Print
            </Button>,
          ]}
        >
          <div className="daily-report-toolbar">
            <span>Hisobot sanasi</span>
            <DatePicker
              allowClear={false}
              value={dailyReportDate}
              onChange={(value) => value && setDailyReportDate(value)}
              disabledDate={(current) => current && current.startOf("day").isAfter(dayjs().startOf("day"))}
              format="DD.MM.YYYY"
            />
            <small>Tanlangan sana bo'yicha haqiqiy ma'lumotlar</small>
          </div>

          {dailyReportError ? (
            <Alert type="error" showIcon message="Kunlik hisobotni olishda xatolik yuz berdi" />
          ) : null}

          <Spin spinning={isDailyReportFetching} tip="Hisobot yuklanmoqda...">
          <div className="daily-report-preview-wrap">
            <div ref={dailyReportRef} className="daily-report-sheet">
              <header className="daily-report-head">
                <div>
                  <div className="daily-report-brand">{hotelName}</div>
                  <div className="daily-report-address">Mehmonxona boshqaruv tizimi</div>
                </div>
                <div className="daily-report-title">
                  <h1>KUNLIK HISOBOT</h1>
                  <strong>{dailyReportDate.format("DD MMMM YYYY")}</strong>
                </div>
              </header>

              <section className="daily-report-summary">
                <div><span>Kunlik tushum</span><strong>{formatMoney(dailyReport?.revenue?.total)} so'm</strong></div>
                <div><span>Kunlik xarajat</span><strong className="is-expense">-{formatMoney(dailyReport?.expenses?.total)} so'm</strong></div>
                <div className="is-primary"><span>Kunlik balans</span><strong>{formatMoney(dailyReport?.balance)} so'm</strong></div>
              </section>

              <section className="daily-report-section">
                <h2>Operatsion ko'rsatkichlar</h2>
                <div className="daily-report-kpis">
                  <div><strong>{Number(dailyReport?.operations?.occupiedRooms || 0)}</strong><span>Band xonalar</span></div>
                  <div><strong>{Number(dailyReport?.operations?.availableRooms || 0)}</strong><span>Bo'sh xonalar</span></div>
                  <div><strong>{Number(dailyReport?.operations?.arrivals || 0)}</strong><span>Kelganlar</span></div>
                  <div><strong>{Number(dailyReport?.operations?.departures || 0)}</strong><span>Ketganlar</span></div>
                  <div><strong>{Number(dailyReport?.operations?.guests || 0)}</strong><span>Jami mehmon</span></div>
                  <div><strong>{Number(dailyReport?.debt?.debtors || 0)}</strong><span>Qarzdorlar</span></div>
                </div>
              </section>

              <div className="daily-report-columns">
                <section className="daily-report-section">
                  <h2>Daromad manbalari</h2>
                  <div className="daily-report-rows">
                    <div><span>Mehmon to'lovlari</span><b>{formatMoney(dailyReport?.revenue?.room)} so'm</b></div>
                    <div><span>Ko'rsatilgan xizmatlar</span><b>{formatMoney(dailyReport?.revenue?.services)} so'm</b></div>
                    <div><span>Zal buyurtmalari</span><b>{formatMoney(dailyReport?.revenue?.hall)} so'm</b></div>
                  </div>
                </section>
                <section className="daily-report-section">
                  <h2>To'lov turlari</h2>
                  <div className="daily-report-rows">
                    <div><span>Naqd</span><b>{formatMoney(dailyReport?.paymentTypes?.cash)} so'm</b></div>
                    <div><span>Bank kartasi / Click</span><b>{formatMoney(dailyReport?.paymentTypes?.card)} so'm</b></div>
                    <div><span>O'tkazma</span><b>{formatMoney(dailyReport?.paymentTypes?.transfer)} so'm</b></div>
                  </div>
                </section>
              </div>

              <section className="daily-report-section">
                <div className="daily-report-section-head"><h2>Asosiy to'lovlar</h2><span>{dailyReport?.payments?.length || 0} ta operatsiya</span></div>
                <table className="daily-report-table">
                  <thead><tr><th>Vaqt</th><th>Manba / mijoz</th><th>To'lov turi</th><th>Summa</th></tr></thead>
                  <tbody>{(dailyReport?.payments || []).map((payment, index) => (
                    <tr key={`${payment.time}-${payment.source}-${index}`}><td>{payment.time}</td><td>{payment.source}</td><td>{PAYMENT_TYPE_LABELS[payment.type] || payment.type}</td><td>{formatMoney(payment.amount)} so'm</td></tr>
                  ))}</tbody>
                </table>
              </section>

              <section className="daily-report-section daily-report-expenses">
                <div className="daily-report-section-head"><h2>Xarajatlar</h2><b>Jami: {formatMoney(dailyReport?.expenses?.total)} so'm</b></div>
                <div className="daily-report-expense-grid">{(dailyReport?.expenses?.items || []).map((expense, index) => (
                  <div key={`${expense.title}-${index}`}><span>{expense.title}</span><b>{formatMoney(expense.amount)} so'm</b></div>
                ))}</div>
              </section>

              <section className="daily-report-debt">
                <div><span>Undirilmagan qarzdorlik</span><strong>{formatMoney(dailyReport?.debt?.total)} so'm</strong></div>
                <p>{Number(dailyReport?.debt?.debtors || 0)} nafar mehmon bo'yicha nazorat talab qilinadi.</p>
              </section>

              <footer className="daily-report-footer">
                <span>Tayyorladi: Administrator __________________</span>
                <span>Chop etildi: {dayjs().format("DD.MM.YYYY HH:mm")}</span>
              </footer>
            </div>
          </div>
          </Spin>
        </Modal>
      </div>
    </div>
  );
}

export default memo(ReportsPage);
