import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Select } from "antd";
import { toast } from "react-toastify";
import { FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiCreditCard, FiEdit2, FiLogOut, FiPlus, FiPrinter } from "react-icons/fi";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { useReactToPrint } from "react-to-print";
import {
  useGetOccupancyQuery,
  useGetRoomsQuery,
  useLazyGetGuestByIdQuery,
  useCheckoutGuestMutation,
  useAddGuestPaymentMutation,
  useAddGuestServiceMutation,
  useUpdateGuestMutation,
  useGetServicesQuery,
} from "../store/employeeApi";
import {
  acquireSocketConnection,
  releaseSocketConnection,
} from "../config/socketConfig";
import PageLoader from "../components/PageLoader";
import BookingConfirmation from "../components/BookingConfirmation";
import "./occupancy.css";

const DAY_COUNT = 14;

const getRoomSortKey = (roomNumber) => {
  const value = String(roomNumber || "").trim();
  const match = value.match(/^(\d+)(.*)$/);

  return {
    number: match ? Number(match[1]) : Number.POSITIVE_INFINITY,
    suffix: (match?.[2] || value).trim(),
  };
};
const DAY_MS = 24 * 60 * 60 * 1000;
const CELL_WIDTH = 52;
const ROW_HEIGHT = 24;

const startOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const dateKey = (date) => {
  const value = startOfDay(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

const addDays = (date, amount) => {
  const value = startOfDay(date);
  value.setDate(value.getDate() + amount);
  return value;
};

const toDayFraction = (value, anchor) => (new Date(value).getTime() - anchor.getTime()) / DAY_MS;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(date);
};

const categoryLabels = {
  standart: "Standart",
  polulyuks: "Polulyuks",
  lyuks: "Lyuks",
  apartament: "Apartament",
  bir_kishilik: "1 kishilik",
};

const guestStatusLabels = {
  active: "Hozir yashayapti",
  booked: "Bron qilingan",
  checked_out: "Checkout qilingan",
  cancelled: "Bekor qilingan",
};

const formatRoomLabel = (room) => {
  if (!room) return "-";
  const parts = [room.roomNumber || "-"];
  if (room.korpus) parts.push(`${room.korpus} korpus`);
  if (room.floor) parts.push(`${room.floor}-qavat`);
  return parts.join(" / ");
};

function OccupancyPage() {
  const [viewStart, setViewStart] = useState(() => startOfDay(new Date()));
  const [korpus, setKorpus] = useState();
  const [floor, setFloor] = useState();
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestAction, setGuestAction] = useState(null);
  const [actionForm] = Form.useForm();
  const bookingPrintRef = useRef(null);
  const guestDetailsRequestRef = useRef(0);
  const token = useSelector((state) => state.auth?.token);
  const todayStart = useMemo(() => startOfDay(new Date()), []);
  const isHistoricalView = viewStart < startOfDay(new Date());
  const viewEnd = useMemo(() => addDays(viewStart, DAY_COUNT), [viewStart]);
  const days = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, index) => addDays(viewStart, index)),
    [viewStart],
  );

  const {
    data: roomsData,
    isLoading: roomsLoading,
    refetch: refetchRooms,
  } = useGetRoomsQuery();
  const {
    data: occupancyData,
    isLoading: occupancyLoading,
    isFetching,
    refetch: refetchOccupancy,
  } =
    useGetOccupancyQuery({ from: dateKey(viewStart), to: dateKey(viewEnd) });
  const [getGuestById, { isFetching: guestDetailsLoading }] =
    useLazyGetGuestByIdQuery();
  const [checkoutGuest, { isLoading: checkingOut }] = useCheckoutGuestMutation();
  const [addPayment, { isLoading: paying }] = useAddGuestPaymentMutation();
  const [addService, { isLoading: savingService }] = useAddGuestServiceMutation();
  const [updateGuest, { isLoading: updatingGuest }] = useUpdateGuestMutation();
  const { data: servicesData } = useGetServicesQuery(true);
  const services = servicesData?.innerData || [];

  const printBooking = useReactToPrint({
    content: () => bookingPrintRef.current,
    documentTitle: `Bron-${selectedGuest?.externalReservationId || selectedGuest?._id || "tasdiq"}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  const openGuestDetails = async (entry) => {
    const requestId = ++guestDetailsRequestRef.current;
    setSelectedGuest(entry);
    try {
      const result = await getGuestById(entry._id).unwrap();
      if (result?.innerData && guestDetailsRequestRef.current === requestId) {
        setSelectedGuest(result.innerData);
      }
    } catch {
      // Shaxmatkadagi ma'lumot modalni ko'rsatish uchun yetarli.
    }
  };

  const closeGuestDetails = () => {
    guestDetailsRequestRef.current += 1;
    setGuestAction(null);
    setSelectedGuest(null);
  };

  const openGuestAction = (action) => {
    if (!selectedGuest?._id || guestDetailsLoading) return;
    actionForm.resetFields();
    if (action === "edit") {
      actionForm.setFieldsValue({
        firstname: selectedGuest.firstname,
        lastname: selectedGuest.lastname,
        passport: selectedGuest.passport,
        phone: selectedGuest.phone,
        email: selectedGuest.email,
        organization: selectedGuest.organization,
        room: selectedGuest.room?._id || selectedGuest.room,
        guestType: selectedGuest.guestType || "uzb",
        dailyRate: Number(selectedGuest.dailyRate || 0),
        stayDays: Number(selectedGuest.stayDays || 1),
        checkInAt: selectedGuest.checkInAt ? dayjs(selectedGuest.checkInAt) : null,
        isBlacklisted: Boolean(selectedGuest.isBlacklisted),
        note: selectedGuest.note || "",
      });
    }
    if (action === "payment") {
      actionForm.setFieldsValue({
        amount: Number(selectedGuest.payableAmount ?? selectedGuest.debtAmount ?? 0),
        type: "naqd",
        paymentDate: dayjs(),
      });
    }
    if (action === "service") actionForm.setFieldsValue({ quantity: 1 });
    setGuestAction(action);
  };

  const saveGuestAction = async (values) => {
    if (!selectedGuest?._id) return;
    try {
      let result;
      if (guestAction === "edit") {
        result = await updateGuest({
          id: selectedGuest._id,
          firstname: String(values.firstname || "").trim(),
          lastname: String(values.lastname || "").trim(),
          passport: String(values.passport || "").trim(),
          phone: String(values.phone || "").trim(),
          email: String(values.email || "").trim(),
          organization: String(values.organization || "").trim(),
          room: values.room,
          guestType: values.guestType,
          dailyRate: Number(values.dailyRate || 0),
          stayDays: Number(values.stayDays || 1),
          checkInAt: values.checkInAt?.toISOString(),
          isBlacklisted: Boolean(values.isBlacklisted),
          note: String(values.note || "").trim(),
        }).unwrap();
      } else if (guestAction === "payment") {
        const amount = Number(values.amount || 0);
        const payable = Number(selectedGuest.payableAmount ?? selectedGuest.debtAmount ?? 0);
        if (amount > payable) {
          toast.error("To‘lov summasi qarzdan oshmasin");
          return;
        }
        result = await addPayment({ id: selectedGuest._id, amount, type: values.type, paymentDate: values.paymentDate?.toISOString(), note: String(values.note || "").trim() }).unwrap();
      } else if (guestAction === "service") {
        const service = services.find((item) => item._id === values.serviceId);
        if (!service) return;
        result = await addService({ id: selectedGuest._id, serviceId: service._id, name: service.name, price: Number(service.defaultPrice || 0), quantity: Number(values.quantity || 1), note: String(values.note || "").trim() }).unwrap();
      }
      if (result?.innerData) setSelectedGuest(result.innerData);
      toast.success(result?.message || "Saqlandi");
      setGuestAction(null);
      refetchOccupancy();
      refetchRooms();
    } catch (error) {
      toast.error(error?.data?.message || "Amalda xatolik");
    }
  };

  const onCheckout = async () => {
    if (!selectedGuest?._id) return;
    try {
      const result = await checkoutGuest(selectedGuest._id).unwrap();
      toast.success(result?.message || "Checkout qilindi");
      closeGuestDetails();
    } catch (error) {
      toast.error(error?.data?.message || "Checkoutda xatolik");
    }
  };

  useEffect(() => {
    const socket = acquireSocketConnection(token);
    if (!socket) return undefined;
    const refreshTimeline = () => {
      refetchOccupancy();
      refetchRooms();
    };
    socket.on("guest_updated", refreshTimeline);
    return () => {
      socket.off("guest_updated", refreshTimeline);
      releaseSocketConnection(socket);
    };
  }, [token, refetchOccupancy, refetchRooms]);

  const rooms = useMemo(() => roomsData?.innerData || [], [roomsData]);
  const occupancy = useMemo(
    () => occupancyData?.innerData || [],
    [occupancyData],
  );
  const floorOptions = useMemo(
    () =>
      [...new Set(rooms.map((room) => room.floor).filter(Number.isFinite))]
        .sort((a, b) => a - b)
        .map((value) => ({ label: `${value}-qavat`, value })),
    [rooms],
  );
  const korpusOptions = useMemo(
    () =>
      [...new Set(rooms.map((room) => String(room.korpus || "").trim()).filter(Boolean))]
        .sort()
        .map((value) => ({ label: `${value} korpus`, value })),
    [rooms],
  );
  const visibleRooms = useMemo(
    () =>
      rooms
        .filter((room) => floor === undefined || room.floor === floor)
        .filter((room) => !korpus || room.korpus === korpus)
        .sort((a, b) => {
          const korpusOrder = String(a.korpus || "").localeCompare(
            String(b.korpus || ""),
            undefined,
            { numeric: true, sensitivity: "base" },
          );
          if (korpusOrder !== 0) return korpusOrder;

          const roomA = getRoomSortKey(a.roomNumber);
          const roomB = getRoomSortKey(b.roomNumber);
          return roomA.number - roomB.number || roomA.suffix.localeCompare(roomB.suffix, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }),
    [rooms, floor, korpus],
  );

  const entriesByRoom = useMemo(() => {
    const grouped = new Map();
    occupancy.forEach((guest) => {
      const stayEnd = guest.checkOutAt || guest.checkoutDueAt;
      const roomStays = guest.roomStays?.length
        ? guest.roomStays
        : [{ room: guest.room, from: guest.bookedForAt || guest.checkInAt, to: null }];
      roomStays.forEach((stay, segmentIndex) => {
        const roomId = stay?.room?._id || stay?.room;
        const startsAt = stay.from;
        const endsAt = stay.to || stayEnd;
        if (!roomId || !startsAt || !endsAt) return;
        const rawStart = toDayFraction(startsAt, viewStart);
        const rawEnd = toDayFraction(endsAt, viewStart);
        const start = Math.max(0, rawStart);
        const end = Math.min(DAY_COUNT, rawEnd);
        if (end <= 0 || end <= start) return;
        const checkoutDay = startOfDay(stayEnd);
        const entry = {
          ...guest,
          segmentKey: `${guest._id}-${segmentIndex}`,
          segmentStartAt: startsAt,
          segmentEndAt: endsAt,
          start,
          end,
          lane: 1,
          isPastStay: Boolean(checkoutDay < todayStart),
          isTodayCheckout: Boolean(checkoutDay.getTime() === todayStart.getTime()),
        };
        grouped.set(roomId, [...(grouped.get(roomId) || []), entry]);
      });
    });

    grouped.forEach((entries, roomId) => {
      const laneEnds = [];
      entries
        .sort((a, b) => a.start - b.start || a.end - b.end)
        .forEach((entry) => {
          const laneIndex = laneEnds.findIndex((end) => end <= entry.start);
          const index = laneIndex === -1 ? laneEnds.length : laneIndex;
          laneEnds[index] = entry.end;
          entry.lane = index + 1;
        });
      grouped.set(roomId, entries);
    });
    return grouped;
  }, [occupancy, viewStart]);

  if (roomsLoading || occupancyLoading) return <PageLoader />;

  return (
    <div className={`employee-page occupancy-page ${isHistoricalView ? "is-historical" : ""}`}>
      <div className="page-card">
        <div className="occupancy-toolbar">
          <div>
            <h2>Shaxmatka</h2>
            {/* <p>Xonalarning kunlar bo‘yicha bandligi va bo‘shligi.</p> */}
          </div>
          <div className="occupancy-actions">
            <Select
              allowClear
              className="occupancy-korpus-select"
              placeholder="Barcha korpuslar"
              value={korpus}
              options={korpusOptions}
              onChange={setKorpus}
            />
            <Select
              allowClear
              className="occupancy-floor-select"
              placeholder="Barcha qavatlar"
              value={floor}
              options={floorOptions}
              onChange={setFloor}
            />
            <Button icon={<FiChevronLeft />} onClick={() => setViewStart((date) => addDays(date, -DAY_COUNT))}>
              Oldingi
            </Button>
            <Button icon={<FiCalendar />} onClick={() => setViewStart(startOfDay(new Date()))}>
              Bugun
            </Button>
            <Button icon={<FiChevronRight />} iconPosition="end" onClick={() => setViewStart((date) => addDays(date, DAY_COUNT))}>
              Keyingi
            </Button>
          </div>
        </div>

        <div className="occupancy-legend" aria-label="Holatlar izohi">
          <span><i className="occupancy-dot occupancy-dot-active" /> Hozir yashayapti</span>
          <span><i className="occupancy-dot occupancy-dot-booked" /> Bron qilingan</span>
          <span><i className="occupancy-dot occupancy-dot-free" /> Bo‘sh</span>
          <span><i className="occupancy-dot occupancy-dot-repair" /> Remont</span>
        </div>

        <div className="occupancy-grid" style={{ "--day-count": DAY_COUNT }}>
          <div className="occupancy-header">
            <div className="occupancy-room-head">Xona</div>
            {days.map((day) => (
              <div className={`occupancy-day-head ${dateKey(day) === dateKey(new Date()) ? "is-today" : ""}`} key={dateKey(day)}>
                <strong>{day.getDate()}</strong>
                <span>{day.toLocaleDateString("uz-UZ", { weekday: "short" })}</span>
              </div>
            ))}
          </div>

          <div className={`occupancy-scroll ${isFetching ? "is-refreshing" : ""}`}>
            {visibleRooms.map((room) => {
              const entries = entriesByRoom.get(room._id) || [];
              const lanes = Math.max(1, ...entries.map((entry) => entry.lane));
              const isRepair = room.status === "remont";
              return (
                <div className="occupancy-room-row" key={room._id}>
                  <div className="occupancy-room-label">
                    <strong>{room.roomNumber}</strong>
                    <span>
                      {room.korpus ? `${room.korpus} korpus · ` : ""}
                      {room.floor}-qavat · {categoryLabels[room.category] || room.category || "-"}
                    </span>
                  </div>
                  <div
                    className={`occupancy-room-timeline ${isRepair ? "is-repair" : ""}`}
                    style={{ "--lanes": lanes }}
                  >
                    {days.map((day) => <div className={`occupancy-cell ${dateKey(day) === dateKey(new Date()) ? "is-today" : ""}`} key={dateKey(day)} />)}
                    {isRepair ? <div className="repair-label">Remont</div> : null}
                    {entries.map((entry) => {
                      const name = `${entry.firstname || ""} ${entry.lastname || ""}`.trim() || "Mehmon";
                      const left = entry.start * CELL_WIDTH;
                      const width = Math.max((entry.end - entry.start) * CELL_WIDTH, 1);
                      return (
                        <button
                          type="button"
                          key={entry.segmentKey}
                          className={[
                            "occupancy-booking",
                            `occupancy-booking-${entry.status}`,
                            entry.isPastStay
                              ? "is-past-stay"
                              : entry.isTodayCheckout
                                ? "is-today-checkout"
                                : "is-current-stay",
                          ].join(" ")}
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                            top: `${(entry.lane - 1) * ROW_HEIGHT}px`,
                          }}
                          title={`${name}: ${formatDate(entry.segmentStartAt)} — ${formatDate(entry.segmentEndAt)}`}
                          onClick={() => openGuestDetails(entry)}
                        >
                          <span>{name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!visibleRooms.length ? <div className="occupancy-empty">Ko‘rsatish uchun xona topilmadi.</div> : null}
      </div>

      <Modal
        title={selectedGuest?.status === "booked" ? "Bron ma’lumotlari" : "Mijoz ma’lumotlari"}
        rootClassName="occupancy-guest-modal"
        width={520}
        open={Boolean(selectedGuest)}
        onCancel={closeGuestDetails}
        footer={
          <div className="table-action-wrap occupancy-guest-actions">
            {selectedGuest?.status === "booked" ? (
              <button
                className="icon-btn"
                title="Bron qog‘ozini print qilish"
                aria-label="Bron qog‘ozini print qilish"
                disabled={guestDetailsLoading}
                onClick={printBooking}
              >
                <FiPrinter size={16} />
              </button>
            ) : null}
            {selectedGuest?.status === "active" ? (
              <>
                <button className="icon-btn" title="Tahrirlash" aria-label="Tahrirlash" disabled={guestDetailsLoading} onClick={() => openGuestAction("edit")}><FiEdit2 size={16} /></button>
                <button className="icon-btn" title={selectedGuest.vip ? "VIP mehmon uchun to‘lov olinmaydi" : "To‘lov"} aria-label="To‘lov" disabled={guestDetailsLoading || selectedGuest.vip || Number(selectedGuest.payableAmount ?? selectedGuest.debtAmount ?? 0) <= 0} onClick={() => openGuestAction("payment")}><FiCreditCard size={16} /></button>
                <button className="icon-btn" title="Xizmat qo‘shish" aria-label="Xizmat qo‘shish" disabled={guestDetailsLoading} onClick={() => openGuestAction("service")}><FiPlus size={17} /></button>
                <button className="icon-btn" title="Hisobot" aria-label="Hisobot" disabled={guestDetailsLoading || (!(selectedGuest.payments || []).length && !(selectedGuest.services || []).length)} onClick={() => openGuestAction("history")}><FiClock size={16} /></button>
                <Popconfirm
                  title="Mehmonni chiqarish"
                  description="Xona avtomatik bo'sh holatga qaytadi"
                  okText="Chiqarish"
                  cancelText="Bekor"
                  okButtonProps={{ loading: checkingOut }}
                  onConfirm={onCheckout}
                  overlayClassName="hotel-popconfirm"
                >
                  <button className="icon-btn" title="Checkout" aria-label="Checkout" disabled={guestDetailsLoading || checkingOut}><FiLogOut size={16} /></button>
                </Popconfirm>
              </>
            ) : null}
          </div>
        }
      >
        {selectedGuest ? (
          <div className="occupancy-detail">
            <div><span>Mijoz</span><strong>{selectedGuest.firstname} {selectedGuest.lastname}</strong></div>
            <div><span>Xona</span><strong>{formatRoomLabel(selectedGuest.room)}</strong></div>
            <div><span>Kelish</span><strong>{formatDate(selectedGuest.bookedForAt || selectedGuest.checkInAt)}</strong></div>
            <div><span>Chiqish</span><strong>{formatDate(selectedGuest.checkOutAt || selectedGuest.checkoutDueAt)}</strong></div>
            <div><span>Holati</span><strong>{guestStatusLabels[selectedGuest.status] || "Noma'lum"}</strong></div>
            {selectedGuest.roomStays?.length > 1 ? (
              <div><span>Xona tarixi</span><strong>{selectedGuest.roomStays.map((stay, index) => (
                <span key={index} className="occupancy-room-stay">
                  {stay.room?.roomNumber || "-"}: {formatDateTime(stay.from)} — {formatDateTime(stay.to || selectedGuest.checkOutAt || selectedGuest.checkoutDueAt)}
                </span>
              ))}</strong></div>
            ) : null}
            {selectedGuest.source === "booking_com" ? (
              <>
                <div><span>Manba</span><strong>Booking.com</strong></div>
                <div><span>Bron raqami</span><strong>{selectedGuest.externalReservationId || "-"}</strong></div>
              </>
            ) : null}
            {selectedGuest.source === "website" && selectedGuest.bookingReference ? (
              <div><span>Bron raqami</span><strong>{selectedGuest.bookingReference}</strong></div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        title={{ edit: "Mehmonni tahrirlash", payment: "To‘lov qo‘shish", service: "Mehmonga xizmat qo‘shish", history: "Hisobot" }[guestAction]}
        open={Boolean(guestAction)}
        onCancel={() => setGuestAction(null)}
        footer={null}
        destroyOnHidden
        width={guestAction === "edit" ? 700 : 520}
        rootClassName="employee-modal-theme"
      >
        {guestAction === "history" ? (
          <div className="occupancy-history">
            <h4>To‘lovlar</h4>
            {(selectedGuest?.payments || []).length ? (selectedGuest.payments.map((payment, index) => (
              <div key={index}><span>{formatDate(payment.paymentDate || payment.createdAt)} · {payment.type}</span><strong>{Number(payment.amount || 0).toLocaleString("uz-UZ")} so‘m</strong></div>
            ))) : <p>To‘lovlar yo‘q</p>}
            <h4>Xizmatlar</h4>
            {(selectedGuest?.services || []).length ? (selectedGuest.services.map((service, index) => (
              <div key={index}><span>{service.name} · {service.quantity || 1} ta</span><strong>{(Number(service.price || 0) * Number(service.quantity || 1)).toLocaleString("uz-UZ")} so‘m</strong></div>
            ))) : <p>Xizmatlar yo‘q</p>}
          </div>
        ) : guestAction ? (
          <Form form={actionForm} layout="vertical" onFinish={saveGuestAction} requiredMark={false}>
            {guestAction === "edit" ? (
              <div className="occupancy-action-form-grid">
                <Form.Item name="firstname" label="Ism" rules={[{ required: true, message: "Ism majburiy" }]}><Input /></Form.Item>
                <Form.Item name="lastname" label="Familiya" rules={[{ required: true, message: "Familiya majburiy" }]}><Input /></Form.Item>
                <Form.Item name="passport" label="Passport / Prava"><Input /></Form.Item>
                <Form.Item name="phone" label="Telefon"><Input /></Form.Item>
                <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email formati noto‘g‘ri" }]}><Input /></Form.Item>
                <Form.Item name="organization" label="Tashkilot"><Input /></Form.Item>
                <Form.Item name="room" label="Xona" rules={[{ required: true, message: "Xona majburiy" }]}><Select showSearch optionFilterProp="label" options={(roomsData?.innerData || []).map((room) => ({ value: room._id, label: formatRoomLabel(room) }))} onChange={(roomId) => {
                  const room = rooms.find((item) => item._id === roomId);
                  if (room) actionForm.setFieldValue("dailyRate", Number((actionForm.getFieldValue("guestType") === "chetellik" ? room.prices?.chetEllik : room.prices?.oddiy) || 0));
                }} /></Form.Item>
                <Form.Item name="guestType" label="Mehmon turi"><Select options={[{ value: "uzb", label: "UZB" }, { value: "chetellik", label: "Chet ellik" }]} /></Form.Item>
                <Form.Item name="dailyRate" label="Kunlik narx" rules={[{ required: true, message: "Narx majburiy" }]}><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item>
                <Form.Item name="stayDays" label="Qolish kuni" rules={[{ required: true, message: "Kun majburiy" }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item>
                <Form.Item name="checkInAt" label="Kelgan sana vaqti" rules={[{ required: true, message: "Sana majburiy" }]}><DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} /></Form.Item>
                <Form.Item name="isBlacklisted" valuePropName="checked"><Checkbox>Qora ro‘yxatga olish</Checkbox></Form.Item>
                <Form.Item name="note" label="Izoh" className="occupancy-action-full"><Input.TextArea rows={2} /></Form.Item>
              </div>
            ) : null}
            {guestAction === "payment" ? (
              <>
                <Form.Item name="amount" label="Summasi" rules={[{ required: true, message: "Summa majburiy" }, { type: "number", min: 1, message: "Eng kamida 1 so‘m" }]}><InputNumber min={1} precision={0} max={Number(selectedGuest?.payableAmount ?? selectedGuest?.debtAmount ?? 0)} style={{ width: "100%" }} /></Form.Item>
                <Form.Item name="type" label="To‘lov turi" rules={[{ required: true }]}><Select options={[{ value: "naqd", label: "Naqd" }, { value: "bank", label: "Bank" }, { value: "karta", label: "Karta" }]} /></Form.Item>
                <Form.Item name="paymentDate" label="To‘lov sanasi" rules={[{ required: true }]}><DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} /></Form.Item>
                <Form.Item name="note" label="Izoh"><Input.TextArea rows={2} /></Form.Item>
              </>
            ) : null}
            {guestAction === "service" ? (
              <>
                <Form.Item name="serviceId" label="Xizmat nomi" rules={[{ required: true, message: "Xizmat tanlang" }]}><Select showSearch optionFilterProp="label" options={services.map((service) => ({ value: service._id, label: `${service.name} (${Number(service.defaultPrice || 0).toLocaleString("uz-UZ")} so‘m)` }))} /></Form.Item>
                <Form.Item name="quantity" label="Soni" rules={[{ required: true }]}><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item>
                <Form.Item name="note" label="Izoh"><Input.TextArea rows={2} /></Form.Item>
              </>
            ) : null}
            <div className="row-actions"><Button htmlType="submit" className="hotel-primary-btn" loading={paying || savingService || updatingGuest}>Saqlash</Button><Button onClick={() => setGuestAction(null)}>Bekor qilish</Button></div>
          </Form>
        ) : null}
      </Modal>

      <div style={{ position: "absolute", left: "-99999px", top: 0 }}>
        <div ref={bookingPrintRef}>
          <BookingConfirmation guest={selectedGuest} />
        </div>
      </div>
    </div>
  );
}

export default OccupancyPage;
