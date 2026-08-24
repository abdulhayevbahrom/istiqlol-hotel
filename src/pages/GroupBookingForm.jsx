import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Segmented,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  useCreateGroupBookingMutation,
  useGetOccupancyQuery,
  useGetRoomsQuery,
} from "../store/employeeApi";

const EMPTY_LIST = [];
const EMPTY_MAP = {};
const GROUP_STEPS = [
  "Umumiy ma'lumot",
  "Xonalar va tarif",
  "Mehmonlarni joylashtirish",
];

function GroupBookingForm({ onModeChange }) {
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [roomPlan, setRoomPlan] = useState([]);
  const progressRef = useRef(null);
  const [createGroupBooking, { isLoading }] = useCreateGroupBookingMutation();
  const { data: roomsData } = useGetRoomsQuery();
  const rooms = useMemo(
    () => roomsData?.innerData || EMPTY_LIST,
    [roomsData?.innerData],
  );
  const selectedRoomIds = Form.useWatch("rooms", form) || EMPTY_LIST;
  const roomGuests = Form.useWatch("roomGuests", form) || EMPTY_MAP;
  const bookedForDate = Form.useWatch("bookedForDate", form);
  const checkoutDate = Form.useWatch("checkoutDate", form);
  const selectedCategory = Form.useWatch("roomCategory", form);
  const availabilityRange = bookedForDate
    ? {
        from: bookedForDate.format("YYYY-MM-DD"),
        to: (checkoutDate || bookedForDate.add(1, "day")).format("YYYY-MM-DD"),
      }
    : null;
  const { data: occupancyData, isFetching: isCheckingAvailability } =
    useGetOccupancyQuery(availabilityRange, { skip: !availabilityRange });
  const occupiedRoomIds = useMemo(
    () =>
      new Set(
        (occupancyData?.innerData || EMPTY_LIST)
          .map((guest) => String(guest.room?._id || guest.room || ""))
          .filter(Boolean),
      ),
    [occupancyData?.innerData],
  );
  const availableRooms = useMemo(
    () =>
      rooms.filter((room) => {
        if (room.status === "remont") return false;
        if (!bookedForDate) return room.status === "bosh";
        return !occupiedRoomIds.has(String(room._id));
      }),
    [bookedForDate, occupiedRoomIds, rooms],
  );
  const selectedRooms = useMemo(
    () => rooms.filter((room) => selectedRoomIds.includes(room._id)),
    [rooms, selectedRoomIds],
  );

  const categoryOptions = useMemo(
    () =>
      [...new Set(availableRooms.map((room) => room.category))]
        .sort()
        .map((category) => ({
          value: category,
          label: category === "bir_kishilik" ? "1 kishilik" : category,
        })),
    [availableRooms],
  );
  const categoryRooms = useMemo(
    () =>
      availableRooms
        .filter(
          (room) =>
            room.category === selectedCategory,
        )
        .sort((a, b) =>
          String(a.roomNumber || "").localeCompare(
            String(b.roomNumber || ""),
            undefined,
            { numeric: true },
          ),
        ),
    [availableRooms, selectedCategory],
  );
  const totalSelectedCapacity = selectedRooms.reduce(
    (sum, room) => sum + Number(room.capacity || 0),
    0,
  );
  const totalAssignedGuests = selectedRooms.reduce(
    (sum, room) => sum + Number(roomGuests?.[room._id]?.guestCount || 0),
    0,
  );

  useEffect(() => {
    if (!categoryOptions.length) {
      form.setFieldValue("roomCategory", undefined);
      return;
    }
    if (categoryOptions.some((option) => option.value === selectedCategory)) return;
    form.setFieldValue("roomCategory", categoryOptions[0].value);
  }, [categoryOptions, form, selectedCategory]);

  useEffect(() => {
    if (!bookedForDate || isCheckingAvailability) return;
    const unavailableSelectedIds = selectedRoomIds.filter(
      (roomId) => !availableRooms.some((room) => room._id === roomId),
    );
    if (!unavailableSelectedIds.length) return;

    const nextRooms = selectedRoomIds.filter(
      (roomId) => !unavailableSelectedIds.includes(roomId),
    );
    const nextRoomGuests = { ...form.getFieldValue("roomGuests") };
    unavailableSelectedIds.forEach((roomId) => delete nextRoomGuests[roomId]);
    form.setFieldsValue({ rooms: nextRooms, roomGuests: nextRoomGuests });
    toast.info("Tanlangan sanada band bo'lgan xonalar tanlovdan olib tashlandi");
  }, [
    availableRooms,
    bookedForDate,
    form,
    isCheckingAvailability,
    selectedRoomIds,
  ]);

  const toggleRoom = (roomId) => {
    const isSelected = selectedRoomIds.includes(roomId);
    const nextRooms = isSelected
      ? selectedRoomIds.filter((id) => id !== roomId)
      : [...selectedRoomIds, roomId];
    form.setFieldValue("rooms", nextRooms);
    if (isSelected) {
      const nextRoomGuests = { ...form.getFieldValue("roomGuests") };
      delete nextRoomGuests[roomId];
      form.setFieldValue("roomGuests", nextRoomGuests);
    }
  };

  const moveToStep = (nextStep) => {
    setStep(Math.max(0, Math.min(nextStep, GROUP_STEPS.length - 1)));
    window.requestAnimationFrame(() => {
      progressRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const goNext = async () => {
    const fieldsByStep = [
      ["name"],
      ["bookedForDate", "checkoutDate", "dailyRate", "rooms"],
      [],
    ];
    try {
      await form.validateFields(fieldsByStep[step]);
      if (step === 1) {
        const missingCount = selectedRooms.some(
          (room) => !Number(roomGuests?.[room._id]?.guestCount || 0),
        );
        if (missingCount) {
          toast.error("Har bir xona uchun mehmonlar sonini kiriting");
          return;
        }
        setRoomPlan(
          selectedRooms.map((room) => ({
            ...room,
            guestCount: Number(
              form.getFieldValue([
                "roomGuests",
                room._id,
                "guestCount",
              ]) || 0,
            ),
          })),
        );
      }
      moveToStep(step + 1);
    } catch {
      toast.error("Majburiy maydonlarni to'ldiring");
    }
  };

  const submit = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue(true);
      if (!values.bookedForDate || !values.checkoutDate) {
        toast.error("Bron boshlanish va tugash sanasini qayta tanlang");
        moveToStep(1);
        return;
      }
      const stayDays = Math.max(
        values.checkoutDate
          .startOf("day")
          .diff(values.bookedForDate.startOf("day"), "day"),
        1,
      );
      const plannedRooms = roomPlan.length ? roomPlan : selectedRooms;
      const roomAssignments = plannedRooms.map((room) => {
        const count = Number(
          room.guestCount || values.roomGuests?.[room._id]?.guestCount || 1,
        );
        const guests = Array.from({ length: count }, (_, index) => {
          const guest = values.roomGuests?.[room._id]?.guests?.[index] || {};
          return {
            firstname:
              String(guest.firstname || "").trim() ||
              String(values.name || "Guruh").trim(),
            lastname: String(guest.lastname || "").trim() || "-",
            passport: String(guest.passport || "").trim(),
            birthDate: guest.birthDate
              ? guest.birthDate.format("YYYY-MM-DD")
              : undefined,
            phone: String(guest.phone || "").trim(),
            email: String(guest.email || "").trim(),
            note: String(guest.note || "").trim(),
          };
        });
        return { room: room._id, guests };
      });
      const result = await createGroupBooking({
        name: String(values.name || "").trim(),
        phone: String(values.phone || "").trim() || undefined,
        email: String(values.email || "").trim() || undefined,
        bookedForDate: values.bookedForDate.format("YYYY-MM-DD"),
        stayDays,
        dailyRate: Number(values.dailyRate || 0),
        mainPaymentType: values.mainPaymentType || "naqd",
        note: String(values.note || "").trim(),
        roomAssignments,
      }).unwrap();
      toast.success(result?.message || "Guruh bron qilindi");
      form.resetFields();
      setRoomPlan([]);
      setStep(0);
    } catch (error) {
      if (error?.errorFields) {
        toast.error("Mehmonlar ma'lumotlarini to'liq kiriting");
        return;
      }
      const backendDetails = Array.isArray(error?.data?.innerData)
        ? error.data.innerData[0]
        : error?.data?.innerData;
      toast.error(
        error?.data?.message ||
          backendDetails ||
          error?.message ||
          error?.error ||
          (error?.status
            ? `Guruhni saqlashda xatolik (${error.status})`
            : "Guruhni saqlashda xatolik"),
      );
    }
  };

  return (
    <div className="checkin-modern">
      <div className="checkin-modern-card group-booking-form">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{
            mainPaymentType: "naqd",
            rooms: EMPTY_LIST,
            roomGuests: EMPTY_MAP,
          }}
        >
          <div className="group-booking-toolbar">
            <Button onClick={() => onModeChange("checkin")}>← Orqaga</Button>
            <div>
              <strong>Guruh bron qilish</strong>
              <span>{step + 1}/{GROUP_STEPS.length} qadam</span>
            </div>
          </div>

          <div
            ref={progressRef}
            className="group-progress"
            aria-label={`Jarayon: ${step + 1}/${GROUP_STEPS.length} qadam`}
          >
            <div className="group-progress-track">
              <div
                className="group-progress-fill"
                style={{ width: `${(step / (GROUP_STEPS.length - 1)) * 100}%` }}
              />
            </div>
            {GROUP_STEPS.map((title, index) => (
              <div
                key={title}
                className={`group-progress-step${index === step ? " is-current" : ""}${index < step ? " is-complete" : ""}`}
              >
                <span className="group-progress-number">
                  {index < step ? "✓" : index + 1}
                </span>
                <strong>{title}</strong>
              </div>
            ))}
          </div>

          <div className="group-step-body" key={step}>
            {step === 0 && (
              <div className="checkin-grid-user">
                <Form.Item name="name" label="Guruh nomi" rules={[{ required: true, message: "Guruh nomi majburiy" }]}>
                  <Input />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label="Telefon (ixtiyoriy)"
                  normalize={(value) => {
                    const raw = String(value || "");
                    const hasPlus = raw.startsWith("+");
                    const digits = raw.replace(/\D/g, "").slice(0, 15);
                    return `${hasPlus ? "+" : ""}${digits}`;
                  }}
                  rules={[
                    {
                      pattern: /^\+?\d{7,15}$/,
                      message: "Telefon 7-15 ta raqamdan iborat bo'lishi kerak",
                    },
                  ]}
                >
                  <Input inputMode="tel" placeholder="+998901234567" />
                </Form.Item>
                <Form.Item
                  name="email"
                  label="Email (ixtiyoriy)"
                  normalize={(value) => String(value || "").trim().toLowerCase()}
                  rules={[
                    {
                      pattern: /^[^\s@]+@gmail\.com$/i,
                      message: "Email @gmail.com formatida bo'lishi kerak",
                    },
                  ]}
                >
                  <Input type="email" placeholder="name@gmail.com" />
                </Form.Item>
                <Form.Item name="mainPaymentType" label="Asosiy to'lov usuli">
                  <Segmented
                    block
                    options={[
                      { label: "Naqd", value: "naqd" },
                      { label: "Bank", value: "bank" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="note" label="Izoh (ixtiyoriy)">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </div>
            )}

            {step === 1 && (
              <>
                <div className="checkin-grid-top">
                  <Form.Item name="bookedForDate" label="Bron boshlanish sanasi (12:00)" rules={[{ required: true, message: "Sana majburiy" }]}>
                    <DatePicker
                      format="DD.MM.YYYY"
                      style={{ width: "100%" }}
                      disabledDate={(date) => date && date.startOf("day").isBefore(dayjs().startOf("day"))}
                      onChange={(date) => {
                        const checkoutDate = form.getFieldValue("checkoutDate");
                        if (
                          date &&
                          (!checkoutDate ||
                            !checkoutDate
                              .startOf("day")
                              .isAfter(date.startOf("day")))
                        ) {
                          form.setFieldValue("checkoutDate", date.add(1, "day"));
                        }
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    name="checkoutDate"
                    label="Qachongacha qoladi"
                    rules={[{ required: true, message: "Chiqish sanasi majburiy" }]}
                  >
                    <DatePicker
                      format="DD.MM.YYYY"
                      style={{ width: "100%" }}
                      disabled={!bookedForDate}
                      disabledDate={(date) =>
                        Boolean(
                          date &&
                            bookedForDate &&
                            !date.startOf("day").isAfter(bookedForDate.startOf("day")),
                        )
                      }
                    />
                  </Form.Item>
                  <Form.Item
                    name="dailyRate"
                    label="Barcha mehmonlar uchun kunlik narx"
                    rules={[
                      {
                        required: true,
                        message: "Kunlik narxni kiriting",
                      },
                    ]}
                  >
                    <InputNumber
                      min={0}
                      precision={0}
                      addonAfter="so'm"
                      style={{ width: "100%" }}
                      formatter={(value) =>
                        String(value ?? "").replace(
                          /\B(?=(\d{3})+(?!\d))/g,
                          " ",
                        )
                      }
                      parser={(value) =>
                        String(value || "").replace(/[^\d]/g, "")
                      }
                    />
                  </Form.Item>
                </div>
                <Form.Item
                  name="rooms"
                  hidden
                  rules={[{ required: true, message: "Kamida bitta xona tanlang" }]}
                >
                  <Input />
                </Form.Item>
                <div className="group-room-picker">
                  <div className="group-room-picker-head">
                    <div>
                      <span className="group-room-kicker">XONA TANLASH</span>
                      <h3>Avval kategoriya, keyin xonalarni tanlang</h3>
                    </div>
                    <Form.Item name="roomCategory" label="Kategoriya">
                      <Select
                        options={categoryOptions}
                        placeholder="Kategoriya tanlang"
                        style={{ minWidth: 220 }}
                      />
                    </Form.Item>
                  </div>

                  <div className="group-room-tiles">
                    {isCheckingAvailability ? (
                      <div className="group-room-state">Xonalar bandligi tekshirilmoqda...</div>
                    ) : null}
                    {categoryRooms.map((room) => {
                      const selected = selectedRoomIds.includes(room._id);
                      const freePlaces = Math.max(
                        Number(room.capacity || 0) -
                          Number(room.activeGuestsCount || 0),
                        0,
                      );
                      return (
                        <button
                          type="button"
                          key={room._id}
                          className={`group-room-tile${selected ? " is-selected" : ""}`}
                          onClick={() => toggleRoom(room._id)}
                        >
                          <span className="group-room-tile-check">
                            {selected ? "✓" : "+"}
                          </span>
                          <strong>{room.roomNumber}</strong>
                          <small>{room.korpus} korpus · {room.floor}-qavat</small>
                          <em>
                            {bookedForDate
                              ? `${room.capacity} o'rin mavjud`
                              : `${freePlaces}/${room.capacity} bo'sh o'rin`}
                          </em>
                        </button>
                      );
                    })}
                    {!isCheckingAvailability && categoryRooms.length === 0 ? (
                      <div className="group-room-state">
                        Bu kategoriya va tanlangan sanalarda bo'sh xona yo'q
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="group-room-selection-stats">
                  <div><span>Tanlangan xonalar</span><strong>{selectedRooms.length} ta</strong></div>
                  <div><span>Umumiy o'rinlar</span><strong>{totalSelectedCapacity} ta</strong></div>
                  <div><span>Joylashtiriladigan mehmonlar</span><strong>{totalAssignedGuests} ta</strong></div>
                </div>

                {selectedRooms.length > 0 && (
                  <div className="group-selected-rooms-title">
                    <span>Tanlangan xonalarga mehmonlar sonini belgilang</span>
                    <small>{selectedRooms.map((room) => `${room.roomNumber} [${room.korpus}]`).join(" · ")}</small>
                  </div>
                )}
                <div className="group-room-cards">
                  {selectedRooms.map((room) => (
                    <Card
                      key={room._id}
                      size="small"
                      className="group-selected-room-card"
                      title={
                        <div>
                          <strong>{room.roomNumber}-xona</strong>
                          <span>{room.category} · {room.korpus} korpus</span>
                        </div>
                      }
                      extra={
                        <Button
                          type="text"
                          danger
                          shape="circle"
                          className="group-selected-room-close"
                          icon={<FiX />}
                          title="Xonani olib tashlash"
                          aria-label={`${room.roomNumber}-xonani olib tashlash`}
                          onClick={() => toggleRoom(room._id)}
                        />
                      }
                    >
                      <Form.Item
                        name={["roomGuests", room._id, "guestCount"]}
                        label={`Mehmonlar soni (max ${room.capacity})`}
                        rules={[{ required: true, message: "Mehmonlar sonini kiriting" }]}
                      >
                        <InputNumber min={1} max={room.capacity} precision={0} style={{ width: "100%" }} />
                      </Form.Item>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {step === 2 && roomPlan.map((room) => {
              const count = Number(room.guestCount || 0);
              return (
                <div key={room._id} className="group-guests-room">
                  <div className="checkin-divider"><span>{room.roomNumber}-xona · {count} ta mehmon</span></div>
                  {Array.from({ length: count }, (_, index) => (
                    <Card key={index} size="small" title={`${index + 1}-mehmon`}>
                      <div className="checkin-grid-user">
                        <Form.Item name={["roomGuests", room._id, "guests", index, "firstname"]} label="Ism (ixtiyoriy)">
                          <Input placeholder={`Default: ${form.getFieldValue("name") || "Guruh nomi"}`} />
                        </Form.Item>
                        <Form.Item name={["roomGuests", room._id, "guests", index, "lastname"]} label="Familiya (ixtiyoriy)">
                          <Input placeholder="Kiritilmasa bo'sh qoladi" />
                        </Form.Item>
                        <Form.Item name={["roomGuests", room._id, "guests", index, "passport"]} label="Passport (ixtiyoriy)"><Input /></Form.Item>
                        <Form.Item name={["roomGuests", room._id, "guests", index, "birthDate"]} label="Tug'ilgan sana (ixtiyoriy)">
                          <DatePicker
                            format="DD.MM.YYYY"
                            style={{ width: "100%" }}
                            disabledDate={(date) => date && date.startOf("day").isAfter(dayjs().startOf("day"))}
                          />
                        </Form.Item>
                        <Form.Item name={["roomGuests", room._id, "guests", index, "phone"]} label="Telefon (ixtiyoriy)"><Input /></Form.Item>
                        <Form.Item name={["roomGuests", room._id, "guests", index, "email"]} label="Email (ixtiyoriy)">
                          <Input type="email" placeholder="name@example.com" />
                        </Form.Item>
                      </div>
                      <Form.Item name={["roomGuests", room._id, "guests", index, "note"]} label="Izoh"><Input /></Form.Item>
                    </Card>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="group-step-actions">
            <Button disabled={step === 0} onClick={() => moveToStep(step - 1)}>Orqaga</Button>
            {step < GROUP_STEPS.length - 1 ? (
              <Button type="primary" onClick={goNext}>Davom etish</Button>
            ) : (
              <Button type="primary" loading={isLoading} onClick={submit}>Guruhni bron qilish</Button>
            )}
          </div>
        </Form>
      </div>
    </div>
  );
}

export default GroupBookingForm;
