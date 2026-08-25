import "./booking-confirmation.css";
import istiqlolHotelLogo from "../assets/istiqlol-hotel-logo.png";
import istiqlolHotelMap from "../assets/istiqlol-hotel-map.png";

const HOTEL_ADDRESS = "Наманганская область, г. Наманган, ул. Ислама Каримова, д. 20";
const HOTEL_PHONE = "+998 78 223 00 15 Администратор 24/7";
const HOTEL_EMAIL = "hotel.istiqlol@mail.ru";
const HOTEL_NAME = "Istiqlol Hotel Namangan";
const HOTEL_URL = "https://istiqlolhotel.uz";
const HOTEL_MAP_URL = "https://www.google.com/maps/search/?api=1&query=40.995713%2C71.588813";
const PURPLE = "#4c2cac";
const ROOM_CATEGORY_LABELS = {
  standart: "Стандартный номер",
  polulyuks: "Полулюкс",
  lyuks: "Люкс",
  apartament: "Апартаменты",
  bir_kishilik: "Одноместный номер",
};

const safeDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const addDays = (value, amount) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDate = (value, withYear = true) => {
  const date = safeDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(date).replace(" г.", "");
};

const formatDateTime = (value) => {
  const date = safeDate(value);
  if (!date) return "-";
  return `${formatDate(date)}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const formatShortDate = (value) => {
  const date = safeDate(value);
  if (!date) return "-";
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
};

const formatMoney = (value) => Number(value || 0).toLocaleString("ru-RU");

const formatGoogleCalendarDate = (value) => {
  const date = safeDate(value);
  if (!date) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "T",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
};

const weekday = (value) =>
  new Intl.DateTimeFormat("ru-RU", { weekday: "short" })
    .format(value)
    .replace(".", "");

const getReservationNumber = (guest) =>
  guest?.externalReservationId || `BR-${String(guest?._id || "").slice(-10).toUpperCase() || "-"}`;

const getStay = (guest) => {
  const checkIn = safeDate(guest?.bookedForAt || guest?.checkInAt) || new Date();
  const checkOut = safeDate(guest?.checkoutDueAt || guest?.checkOutAt) || addDays(checkIn, Number(guest?.stayDays || 1));
  const nights = Math.max(
    Number(guest?.stayDays || 0),
    Math.round((startOfDay(checkOut) - startOfDay(checkIn)) / 86400000),
    1,
  );
  return { checkIn, checkOut, nights };
};

const buildCalendar = (checkIn, nights) => {
  const monday = startOfDay(checkIn);
  const mondayOffset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - mondayOffset);
  const stayStart = startOfDay(checkIn).getTime();
  const stayEnd = addDays(startOfDay(checkIn), nights).getTime();
  return Array.from({ length: 21 }, (_, index) => {
    const date = addDays(monday, index);
    const timestamp = date.getTime();
    return { date, charged: timestamp >= stayStart && timestamp < stayEnd };
  });
};

function PageChrome({ reservationNumber, page, children }) {
  return (
    <section className="booking-confirmation-page">
      <div className="booking-browser-head">
        <span>Подтверждение бронирования. Бронирование № {reservationNumber}</span>
      </div>
      {children}
      <div className="booking-browser-foot">
        <span>{page}/2</span>
      </div>
    </section>
  );
}

function BookingConfirmation({ guest }) {
  if (!guest) return null;

  const reservationNumber = getReservationNumber(guest);
  const { checkIn, checkOut, nights } = getStay(guest);
  const calendar = buildCalendar(checkIn, nights);
  const total = Number(guest.externalTotalAmount || guest.totalAmount || guest.dailyRate * nights || 0);
  const paid = Number(guest.paidAmount || 0);
  const due = Math.max(total - paid, 0);
  const dailyRate = Number(guest.dailyRate || (nights ? total / nights : total) || 0);
  const room = guest.room || {};
  const roomCategory = String(room.category || "").trim().toLowerCase();
  const roomName = ROOM_CATEGORY_LABELS[roomCategory] || "Номер";
  const roomLabel = room.roomNumber
    ? roomName === "Номер"
      ? `Номер № ${room.roomNumber}`
      : `${roomName}, номер ${room.roomNumber}`
    : roomName;
  const fullName = `${guest.firstname || ""} ${guest.lastname || ""}`.trim() || "-";
  const bookedAt = guest.externalBookedAt || guest.createdAt || new Date();
  const googleCalendarParams = new URLSearchParams({
    action: "TEMPLATE",
    text: `${HOTEL_NAME} - Бронь № ${reservationNumber}`,
    dates: `${formatGoogleCalendarDate(checkIn)}/${formatGoogleCalendarDate(checkOut)}`,
    details: `Гость: ${fullName}\nНомер: ${room.roomNumber || "-"}\nБронь № ${reservationNumber}`,
    location: HOTEL_ADDRESS,
    ctz: "Asia/Tashkent",
  });
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?${googleCalendarParams.toString()}`;

  return (
    <div className="booking-confirmation" style={{ "--booking-purple": PURPLE }}>
      <PageChrome reservationNumber={reservationNumber} page={1}>
        <main className="booking-page-content booking-page-one">
          <header className="booking-hero">
            <h1>Подтверждение бронирования</h1>
            <h2>Бронь № {reservationNumber}</h2>
            <p><b>Дата и время бронирования:</b> {formatDateTime(bookedAt)} (UTC +05:00)</p>
          </header>

          <section className="booking-hotel-block">
            <div>
              <h2><a href={HOTEL_URL} target="_blank" rel="noreferrer">{HOTEL_NAME}</a></h2>
              <dl>
                <dt>Адрес</dt><dd>{HOTEL_ADDRESS}</dd>
                <dt>Телефон</dt><dd>{HOTEL_PHONE}</dd>
                <dt>Эл. почта</dt><dd><u>{HOTEL_EMAIL}</u></dd>
              </dl>
            </div>
            <div className="booking-logo-box">
              <img src={istiqlolHotelLogo} alt="Istiqlol Hotel Namangan" />
            </div>
          </section>

          <section className="booking-section booking-details-section">
            <h2>Детали бронирования</h2>
            <div className="booking-summary-grid">
              <div><span>Заезд</span><b>{formatDate(checkIn)}, {weekday(checkIn)}</b><small>после {String(checkIn.getHours()).padStart(2, "0")}:{String(checkIn.getMinutes()).padStart(2, "0")}</small></div>
              <div><span>Выезд</span><b>{formatDate(checkOut)}, {weekday(checkOut)}</b><small>до {String(checkOut.getHours()).padStart(2, "0")}:{String(checkOut.getMinutes()).padStart(2, "0")}</small></div>
              <div><span>Ночей</span><b>{nights}</b></div>
              <div><span>Гостей</span><b>1</b></div>
              <div><span>Номеров</span><b>1</b></div>
            </div>
            <div className="booking-calendar-links">
              <span>▣ &nbsp;<u>Добавить в календарь Outlook / iCal</u></span>
              <a href={googleCalendarUrl} target="_blank" rel="noreferrer" className="google-calendar-link">
                <svg className="google-calendar-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M4 3h11l5 5v12H4z" />
                  <path fill="#34A853" d="M4 15h8v5H4z" />
                  <path fill="#FBBC04" d="M12 15h8v5h-8z" />
                  <path fill="#EA4335" d="M15 3v5h5z" />
                  <path fill="#fff" d="M7 8h10v8H7z" />
                  <text x="12" y="14.4" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#4285F4">31</text>
                </svg>
                <u>Добавить в Google календарь</u>
              </a>
            </div>
          </section>

          <section className="booking-customer">
            <h3>ДАННЫЕ ЗАКАЗЧИКА</h3>
            <div><span>ФИО</span><b>{fullName}{guest.passport ? ` Паспорт: ${guest.passport}` : ""}{guest.birthDate ? ` Дата рождения: ${formatShortDate(guest.birthDate)}` : ""}</b></div>
          </section>

          <section className="booking-section booking-price-section">
            <h2>Стоимость бронирования</h2>
            <div className="booking-tariff-row"><span>Тариф</span><b>Тариф по умолчанию</b></div>
            <div className="booking-cost-table">
              <div className="booking-cost-head"><b>№1: {roomLabel}</b><b>{formatMoney(total)}<small>UZS</small></b></div>
              <div className="booking-cost-line"><span>Размещение</span><span>1 взрослый</span><span>1 чел.</span><span>{formatMoney(total)}<small>UZS</small></span></div>
              <div className="booking-cost-line"><span>Услуга</span><span>Завтрак "Шведский стол"</span><span>1 шт.</span><span>Включено в<br />стоимость</span></div>
              <div className="booking-total-line"><b>Общая стоимость</b><b>{formatMoney(total)} UZS</b></div>
              <div className="booking-payment-line"><b>Способ оплаты</b><span>{guest.mainPaymentType === "bank" ? "Банковский перевод" : "Оплата при заселении"}</span></div>
              <div className="booking-payment-line"><b>Внесена предоплата</b><span>{formatMoney(paid)} UZS</span></div>
              <div className="booking-total-line"><b>К оплате гостем</b><span>{formatMoney(due)} UZS</span></div>
            </div>
          </section>

          <section className="booking-tariff-description">
            <h3>ОПИСАНИЕ ТАРИФА</h3>
            <p><span className="booking-bell">●</span><b>Тариф по умолчанию</b></p>
            <p><span>🍴</span>Завтрак "Шведский стол" &nbsp; включен</p>
          </section>
        </main>
      </PageChrome>

      <PageChrome reservationNumber={reservationNumber} page={2}>
        <main className="booking-page-content booking-page-two">
          <section className="booking-room-title"><b>№1</b><h2>{roomLabel}</h2></section>
          <div className="booking-room-facts"><div><b>Количество<br />гостей:</b><span>1</span></div><div><b>Гость:</b><strong>{fullName}{guest.passport ? ` Паспорт: ${guest.passport}` : ""}{guest.birthDate ? ` Дата рождения: ${formatShortDate(guest.birthDate)}` : ""}</strong></div><div><span>Пол:</span><span>-</span></div><div><span>Гражданство:</span><span>{guest.guestType === "chetellik" ? "Иностранное" : "Узбекистан"}</span></div></div>

          <section className="booking-breakdown">
            <h3>ДЕТАЛИЗАЦИЯ ЦЕНЫ <span>{formatDate(checkIn)} ({weekday(checkIn)}) — {formatDate(checkOut)} ({weekday(checkOut)})</span></h3>
            <div className="booking-calendar-table">
              <div className="booking-calendar-days">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <b key={day}>{day}</b>)}</div>
              <div className="booking-calendar-body">
                <div className="booking-calendar-cells">
                  {calendar.map(({ date, charged }) => <div key={date.toISOString()}><span>{date.getDate()} {new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(date).replace(".", "")}</span>{charged ? <b>{formatMoney(dailyRate)}</b> : null}</div>)}
                </div>
                <div className="booking-calendar-total">{formatMoney(total)}</div>
              </div>
            </div>
          </section>

          <section className="booking-location">
            <h2>Местоположение <a href={HOTEL_URL} target="_blank" rel="noreferrer">{HOTEL_NAME}</a></h2>
            <dl><dt>Адрес:</dt><dd>{HOTEL_ADDRESS}</dd><dt>Координаты:</dt><dd>40.995713, 71.588813</dd><dt>Как добраться:</dt><dd>2.6 км Афсоналар Вэлли Парк, 2 км Парк имени Бабура</dd></dl>
            <div className="booking-map">
              <img src={istiqlolHotelMap} alt="Карта расположения Istiqlol Hotel Namangan" />
              <a
                className="booking-map-link"
                href={HOTEL_MAP_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="Открыть расположение Istiqlol Hotel в Google Maps"
                title="Открыть в Google Maps"
              />
            </div>
          </section>

          <footer className="booking-purple-footer">
            <p>© {new Date().getFullYear()} <a href={HOTEL_URL} target="_blank" rel="noreferrer">{HOTEL_NAME}</a>,<br />{HOTEL_ADDRESS}</p>
            <p>Письмо автоматически сформировано Istiqlol Suite</p>
          </footer>
        </main>
      </PageChrome>
    </div>
  );
}

export default BookingConfirmation;
