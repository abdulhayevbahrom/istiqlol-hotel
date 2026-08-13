import { memo, useEffect, useMemo, useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/uz";
import { useNavigate } from "react-router-dom";
import {
  ArcElement,
  BarElement,
  Chart as ChartJS,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  FiAlertTriangle,
  FiDollarSign,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { useGetDashboardSummaryQuery } from "../store/employeeApi";
import "./dashboard.css";

dayjs.locale("uz");
ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const RECENT_STATUS_LABEL = {
  active: "To'landi",
  checked_out: "Chiqdi",
  booked: "Kutilmoqda",
};

const WEEKDAY_FALLBACK = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Ju", "Shan"];

const formatMoney = (value) => Number(value || 0).toLocaleString("uz-UZ");

const formatCompactMoney = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000_000)
    return `${(amount / 1_000_000_000).toFixed(1)} mlrd`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} mln`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)} ming`;
  return `${Math.round(amount)}`;
};

const formatAxisMoneyCompact = (value) => {
  const amount = Number(value || 0);
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}m`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
  return `${Math.round(amount)}`;
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

function DashboardPage() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(() =>
    dayjs().startOf("month"),
  );
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );
  const isCompactWeeklyChart = viewportWidth <= 480;

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const monthKey = selectedMonth.format("YYYY-MM");

  const { data, isLoading } = useGetDashboardSummaryQuery(monthKey, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const dashboardData = data?.innerData || {};
  const kpis = dashboardData?.kpis || {};
  const todayChange = kpis?.todayChange || { percent: 0, up: true };
  const monthChange = kpis?.monthChange || { percent: 0, up: true };
  const dailySnapshot = dashboardData?.dailySnapshot || {};
  const weeklyRevenue = Array.isArray(dashboardData?.weeklyRevenue)
    ? dashboardData.weeklyRevenue
    : [];
  const paymentShare = Array.isArray(dashboardData?.paymentShare)
    ? dashboardData.paymentShare
    : [];
  const recentPayments = Array.isArray(dashboardData?.recentPayments)
    ? dashboardData.recentPayments
    : [];
  const monthlyChart = dashboardData?.monthlyChart || {};
  const roomOverview = dashboardData?.roomOverview || {};
  const roomChart = roomOverview?.chart || {};
  const weeklyChartData = useMemo(() => {
    return {
      labels: weeklyRevenue.map(
        (item, index) => item?.label || WEEKDAY_FALLBACK[index] || "-",
      ),
      datasets: [
        {
          label: "Sales",
          data: weeklyRevenue.map((item) => Number(item?.amount || 0)),
          backgroundColor: "rgba(47, 120, 111, 0.82)",
          borderWidth: 0,
          borderRadius: 0,
          borderSkipped: false,
          barPercentage: 0.72,
          categoryPercentage: 0.72,
          hoverBackgroundColor: "rgba(35, 61, 102, 0.9)",
        },
      ],
    };
  }, [weeklyRevenue]);
  const weeklyChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest", intersect: true },
      layout: {
        padding: {
          top: 0,
          right: isCompactWeeklyChart ? 2 : 6,
          bottom: isCompactWeeklyChart ? 0 : 2,
          left: isCompactWeeklyChart ? 0 : 2,
        },
      },
      plugins: {
        legend: {
          display: !isCompactWeeklyChart,
          position: "top",
          labels: {
            color: "#2b3851",
            boxWidth: 48,
            boxHeight: 10,
            padding: 8,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: "rgba(35, 61, 102, 0.94)",
          titleColor: "#fff4dd",
          bodyColor: "#fff4dd",
          displayColors: true,
          padding: 8,
          callbacks: {
            title: (items) => items?.[0]?.label || "",
            label: (context) =>
              `Sales: ${formatCompactMoney(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(0, 0, 0, 0.08)",
            drawTicks: true,
          },
          border: { color: "rgba(0, 0, 0, 0.08)" },
          ticks: {
            color: "#6e6047",
            font: { size: isCompactWeeklyChart ? 10 : 11 },
            maxRotation: 0,
            autoSkip: false,
            maxTicksLimit: 7,
          },
        },
        y: {
          beginAtZero: true,
          border: { color: "rgba(0, 0, 0, 0.08)" },
          grid: {
            color: "rgba(0, 0, 0, 0.08)",
            drawTicks: true,
          },
          ticks: {
            color: "#6e6047",
            padding: isCompactWeeklyChart ? 3 : 6,
            maxTicksLimit: isCompactWeeklyChart ? 5 : 7,
            callback: (value) =>
              isCompactWeeklyChart
                ? formatAxisMoneyCompact(value)
                : formatCompactMoney(value),
          },
        },
      },
    }),
    [isCompactWeeklyChart],
  );

  const monthlyChartData = useMemo(() => {
    const labels = Array.isArray(monthlyChart?.labels)
      ? monthlyChart.labels
      : [];
    const revenue = Array.isArray(monthlyChart?.revenue)
      ? monthlyChart.revenue
      : [];
    const expense = Array.isArray(monthlyChart?.expense)
      ? monthlyChart.expense
      : [];
    return {
      labels,
      datasets: [
        {
          label: "Tushgan to'lov",
          data: revenue,
          borderColor: "#2f786f",
          backgroundColor: "rgba(47, 120, 111, 0.18)",
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#2f786f",
          pointRadius: 2.8,
          pointHoverRadius: 4.5,
          borderWidth: 2.5,
          tension: 0.34,
          fill: true,
        },
        {
          label: "Xarajat",
          data: expense,
          borderColor: "#c55b4c",
          backgroundColor: "rgba(197, 91, 76, 0.1)",
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#c55b4c",
          pointRadius: 2.8,
          pointHoverRadius: 4.5,
          borderWidth: 2.5,
          tension: 0.34,
          fill: false,
        },
      ],
    };
  }, [monthlyChart]);
  const monthlyChartWidth = Number(monthlyChart?.width || 760);
  const monthlyChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${formatMoney(context.parsed.y)} so'm`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { color: "#ebdfcb" },
          ticks: {
            color: "#8b7d63",
            maxRotation: 0,
            autoSkip: false,
            padding: 6,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: "#ece0cb" },
          border: { color: "#ebdfcb" },
          ticks: {
            color: "#9e8f74",
            callback: (value) => formatCompactMoney(value),
          },
        },
      },
    }),
    [],
  );
  const roomChartData = useMemo(
    () => ({
      labels: Array.isArray(roomChart?.labels) ? roomChart.labels : [],
      datasets: [
        {
          data: Array.isArray(roomChart?.values) ? roomChart.values : [],
          backgroundColor: Array.isArray(roomChart?.colors)
            ? roomChart.colors
            : ["#c55b4c", "#2f786f", "#d1a13c"],
          borderColor: "#fffaf1",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    }),
    [roomChart],
  );
  const roomChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.label}: ${Number(context.parsed || 0)} ta`,
          },
        },
      },
    }),
    [],
  );

  const onMonthChange = (value) => {
    if (!value) {
      setSelectedMonth(dayjs().startOf("month"));
      return;
    }
    setSelectedMonth(value.startOf("month"));
  };

  if (isLoading && !data) {
    return (
      <div className="dashboard-skeleton">
        <div className="dashboard-skeleton-topbar">
          <div className="dashboard-skeleton-title shimmer" />
          <div className="dashboard-skeleton-pill shimmer" />
        </div>

        <div className="dashboard-skeleton-kpis">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="dashboard-skeleton-kpi shimmer"
              key={`sk-kpi-${index}`}
            >
              <div className="dashboard-skeleton-icon" />
              <div className="dashboard-skeleton-line w-40" />
              <div className="dashboard-skeleton-line w-65 lg" />
              <div className="dashboard-skeleton-line w-55" />
            </div>
          ))}
        </div>

        <div className="dashboard-skeleton-main">
          <div className="dashboard-skeleton-panel shimmer">
            <div className="dashboard-skeleton-line w-35" />
            <div className="dashboard-skeleton-chart-bars">
              {Array.from({ length: 7 }).map((_, index) => (
                <span key={`bar-${index}`} />
              ))}
            </div>
          </div>

          <div className="dashboard-skeleton-panel shimmer">
            <div className="dashboard-skeleton-line w-50" />
            <div className="dashboard-skeleton-mini-grid">
              {Array.from({ length: 4 }).map((_, index) => (
                <span key={`mini-${index}`} />
              ))}
            </div>
            <div className="dashboard-skeleton-line w-45" />
            <div className="dashboard-skeleton-payments">
              {Array.from({ length: 3 }).map((_, index) => (
                <span key={`pay-${index}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-skeleton-title shimmer short" />

        <div className="dashboard-skeleton-bottom">
          <div className="dashboard-skeleton-panel shimmer">
            <div className="dashboard-skeleton-line w-45" />
            <div className="dashboard-skeleton-table">
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={`row-${index}`} />
              ))}
            </div>
          </div>
          <div className="dashboard-skeleton-panel shimmer">
            <div className="dashboard-skeleton-line w-50" />
            <div className="dashboard-skeleton-line-chart" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-topbar">
        <div className="dashboard-section-title">Daromad ko'rsatkichlari</div>
        <DatePicker
          picker="month"
          allowClear={false}
          value={selectedMonth}
          onChange={onMonthChange}
          format="MMMM YYYY"
          className="dashboard-month-picker"
        />
      </div>

      <div className="dashboard-kpi-grid">
        <article
          className="dashboard-kpi dashboard-kpi-revenue dashboard-clickable-card"
          {...createNavigateProps(
            navigate,
            "/reports",
            "Daromad tafsilotlarini ochish",
          )}
        >
          <div className="dashboard-kpi-icon">
            <FiDollarSign size={16} />
          </div>
          <div className="dashboard-kpi-label">Bugungi daromad</div>
          <div className="dashboard-kpi-value">
            {formatCompactMoney(kpis?.todayRevenue)} <span>so'm</span>
          </div>
          <div
            className={`dashboard-kpi-meta ${todayChange.up ? "up" : "down"}`}
          >
            {todayChange.up ? "▲" : "▼"} {todayChange.percent}% - oldingi kunga
            nisbatan
          </div>
        </article>

        <article
          className="dashboard-kpi dashboard-kpi-monthly dashboard-clickable-card"
          {...createNavigateProps(
            navigate,
            "/reports",
            "Oylik hisobotlarni ochish",
          )}
        >
          <div className="dashboard-kpi-icon">
            <FiTrendingUp size={16} />
          </div>
          <div className="dashboard-kpi-label">Oylik daromad</div>
          <div className="dashboard-kpi-value">
            {formatCompactMoney(kpis?.monthRevenue)} <span>so'm</span>
          </div>
          <div
            className={`dashboard-kpi-meta ${monthChange.up ? "up" : "down"}`}
          >
            {monthChange.up ? "▲" : "▼"} {monthChange.percent}% - o'tgan oydan
          </div>
        </article>

        <article
          className="dashboard-kpi dashboard-kpi-guests dashboard-clickable-card"
          {...createNavigateProps(
            navigate,
            "/guests-active",
            "Faol mehmonlar bo'limini ochish",
          )}
        >
          <div className="dashboard-kpi-icon">
            <FiUsers size={16} />
          </div>
          <div className="dashboard-kpi-label">Faol mehmonlar</div>
          <div className="dashboard-kpi-value">
            {Number(kpis?.activeGuests || 0)}
          </div>
          <div className="dashboard-kpi-meta neutral">
            {Number(kpis?.bookedGuests || 0)} ta bron mavjud
          </div>
        </article>

        <article
          className="dashboard-kpi dashboard-kpi-debtors dashboard-clickable-card"
          {...createNavigateProps(
            navigate,
            "/guests-debtors",
            "Qarzdorlar bo'limini ochish",
          )}
        >
          <div className="dashboard-kpi-icon">
            <FiAlertTriangle size={16} />
          </div>
          <div className="dashboard-kpi-label">Qarzdorlar</div>
          <div className="dashboard-kpi-value">
            {Number(kpis?.debtorsCount || 0)}
          </div>
          <div className="dashboard-kpi-meta neutral">
            Jami: {formatCompactMoney(kpis?.debtorsAmount)} so'm
          </div>
        </article>
      </div>

      <div className="dashboard-main-grid">
        <section
          className="dashboard-panel dashboard-weekly dashboard-clickable-card"
          {...createNavigateProps(
            navigate,
            "/reports",
            "Haftalik daromad hisobotini ochish",
          )}
        >
          <header className="dashboard-panel-head">
            <h3>Haftalik daromad</h3>
            <span>{dashboardData?.month || monthKey}</span>
          </header>
          <div className="dashboard-weekly-chart">
            <Bar data={weeklyChartData} options={weeklyChartOptions} />
          </div>
        </section>

        <aside className="dashboard-panel dashboard-today">
          <header className="dashboard-panel-head">
            <h3>Kunlik holat</h3>
            <span>{dailySnapshot?.date || "-"}</span>
          </header>
          <div className="dashboard-mini-grid">
            <div
              className="dashboard-mini-card dashboard-clickable-card"
              {...createNavigateProps(
                navigate,
                "/guests-history",
                "Kelgan mijozlar tarixini ochish",
              )}
            >
              <span>Keldi</span>
              <strong>{Number(dailySnapshot?.arrived || 0)}</strong>
            </div>
            <div
              className="dashboard-mini-card dashboard-clickable-card"
              {...createNavigateProps(
                navigate,
                "/guests-history",
                "Ketgan mijozlar tarixini ochish",
              )}
            >
              <span>Chiqdi</span>
              <strong>{Number(dailySnapshot?.left || 0)}</strong>
            </div>
            <div
              className="dashboard-mini-card dashboard-clickable-card"
              {...createNavigateProps(
                navigate,
                "/guests-active",
                "Kutilayotgan bronlarni ochish",
              )}
            >
              <span>Ertaga keladi</span>
              <strong>{Number(dailySnapshot?.pendingNextDay || 0)}</strong>
            </div>
            <div
              className="dashboard-mini-card dashboard-clickable-card"
              {...createNavigateProps(
                navigate,
                "/guests-active",
                "VIP mijozlarni ochish",
              )}
            >
              <span>VIP</span>
              <strong>{Number(dailySnapshot?.vip || 0)}</strong>
            </div>
          </div>

          <div className="dashboard-subtitle">To'lov usullari</div>
          <div className="dashboard-payment-list">
            {paymentShare.map((item) => (
              <div key={item?.type} className="dashboard-payment-row">
                <div className="dashboard-payment-head">
                  <span>{item?.label || "-"}</span>
                  <b>{Number(item?.percent || 0)}%</b>
                </div>
                <div className="dashboard-payment-track">
                  <div
                    className={`dashboard-payment-fill ${
                      item?.type === "naqd"
                        ? "cash"
                        : item?.type === "karta"
                          ? "card"
                          : item?.type === "click"
                            ? "click"
                            : "bank"
                    }`}
                    style={{ width: `${Number(item?.percent || 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="dashboard-section-title">So'nggi to'lovlar</div>

      <div className="dashboard-bottom-grid">
        <section
          className="dashboard-panel dashboard-clickable-card"
          {...createNavigateProps(
            navigate,
            "/guests-history",
            "Mijozlar tarixini ochish",
          )}
        >
          <header className="dashboard-panel-head">
            <h3>Mehmon to'lovlari</h3>
            <span>{dashboardData?.month || monthKey}</span>
          </header>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Mehmon</th>
                  <th>Xona</th>
                  <th>Holat</th>
                  <th>Summa</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment, index) => (
                  <tr key={`${payment?.guestId || "guest"}-${index}`}>
                    <td>{payment?.guestName || "-"}</td>
                    <td>{payment?.roomNumber || "-"}</td>
                    <td>
                      <span
                        className={`dashboard-status ${payment?.status || "active"}`}
                      >
                        {payment?.vip
                          ? "VIP"
                          : RECENT_STATUS_LABEL[payment?.status] || "Faol"}
                      </span>
                    </td>
                    <td>{formatMoney(payment?.amount)} so'm</td>
                  </tr>
                ))}
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="dashboard-empty">
                      To'lovlar hali mavjud emas
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="dashboard-panel dashboard-clickable-card"
          {...createNavigateProps(
            navigate,
            "/rooms",
            "Xonalar bo'limini ochish",
          )}
        >
          <header className="dashboard-panel-head">
            <h3>Xonalar holati</h3>
            <span>{dashboardData?.month || monthKey}</span>
          </header>
          <div className="dashboard-rooms-layout">
            <div className="dashboard-rooms-donut">
              <Doughnut data={roomChartData} options={roomChartOptions} />
            </div>
            <div className="dashboard-rooms-stats">
              <div className="dashboard-room-stat-row">
                <span className="dot occupied" />
                <b>Band xonalar</b>
                <strong>{Number(roomOverview?.occupied || 0)} ta</strong>
              </div>
              <div className="dashboard-room-stat-row">
                <span className="dot free" />
                <b>Bo'sh xonalar</b>
                <strong>{Number(roomOverview?.free || 0)} ta</strong>
              </div>
              <div className="dashboard-room-stat-row">
                <span className="dot repair" />
                <b>Remontdagi</b>
                <strong>{Number(roomOverview?.repair || 0)} ta</strong>
              </div>
              <div className="dashboard-room-metrics">
                <span>Jami: {Number(roomOverview?.total || 0)} ta</span>
                <span>
                  Bandlik: {Number(roomOverview?.occupancyPercent || 0)}%
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section
        className="dashboard-panel dashboard-monthly-panel dashboard-clickable-card"
        {...createNavigateProps(
          navigate,
          "/expenses",
          "Xarajatlar bo'limini ochish",
        )}
      >
        <header className="dashboard-panel-head">
          <h3>Oylik dinamika</h3>
          <span>{dashboardData?.month || monthKey}</span>
        </header>
        <div className="dashboard-line-legend">
          <span className="dashboard-legend-item">
            <i className="dashboard-legend-dot revenue" />
            Tushgan to'lov
          </span>
          <span className="dashboard-legend-item">
            <i className="dashboard-legend-dot expense" />
            Xarajat
          </span>
        </div>
        <div className="dashboard-line-summary">
          <span className="dashboard-line-summary-item revenue">
            Jami tushum: {formatMoney(monthlyChart?.totalRevenue)} so'm
          </span>
          <span className="dashboard-line-summary-item expense">
            Jami xarajat: {formatMoney(monthlyChart?.totalExpense)} so'm
          </span>
        </div>
        <div className="dashboard-chartjs-scroll">
          <div
            className="dashboard-chartjs-wrap"
            style={{ width: `${monthlyChartWidth}px` }}
          >
            <Line data={monthlyChartData} options={monthlyChartOptions} />
          </div>
        </div>
      </section>
    </div>
  );
}

export default memo(DashboardPage);
