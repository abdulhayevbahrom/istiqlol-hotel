import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Segmented,
  Select,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import {
  useCreateGuestMutation,
  useCreateGuestsBulkMutation,
  useGetRoomsQuery,
  useLazyGetGuestByPassportQuery,
} from "../store/employeeApi";

const roomTypeOptions = [
  { label: "Standart", value: "standart" },
  { label: "Polulyuks", value: "polulyuks" },
  { label: "Lyuks", value: "lyuks" },
  { label: "Apartament", value: "apartament" },
  { label: "1 Kishilik", value: "bir_kishilik" },
];

const initialValues = {
  mode: "checkin",
  roomType: "standart",
  guestType: "uzb",
  vip: false,
  bookedForDate: null,
  room: undefined,
  dailyRate: 0,
  stayDays: 1,
  firstname: "",
  lastname: "",
  passport: "",
  birthDate: "",
  phone: "",
  note: "",
  additionalGuests: [],
};

const normalizeUzDateInput = (value) => {
  const raw = String(value || "").replace(/[^\d.]/g, "");
  const digits = raw.replace(/\./g, "").slice(0, 8);
  const parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join(".");
};

const parseUzDateToIso = (value) => {
  const cleaned = String(value || "").trim();
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(cleaned)) return null;

  const [dd, mm, yyyy] = cleaned.split(".").map(Number);
  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  const isValid =
    date.getUTCFullYear() === yyyy &&
    date.getUTCMonth() === mm - 1 &&
    date.getUTCDate() === dd;

  if (!isValid) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(
    2,
    "0",
  )}`;
};

const normalizePhoneInput = (value) => {
  const raw = String(value || "");
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  return `${hasPlus ? "+" : ""}${digits}`;
};

const formatIsoToUzDate = (isoValue) => {
  if (!isoValue) return "";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

const blockNonNumericKeys = (event) => {
  const allowedControlKeys = [
    "Backspace",
    "Delete",
    "Tab",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
  ];
  if (allowedControlKeys.includes(event.key)) return;
  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
};

function GuestCheckinPage() {
  const [form] = Form.useForm();
  const { data: roomsData } = useGetRoomsQuery();
  const [createGuest, { isLoading }] = useCreateGuestMutation();
  const [createGuestsBulk, { isLoading: isBulkLoading }] =
    useCreateGuestsBulkMutation();
  const [fetchGuestByPassport] = useLazyGetGuestByPassportQuery();
  const passportValue = Form.useWatch("passport", form);
  const selectedRoomId = Form.useWatch("room", form);
  const additionalGuests = Form.useWatch("additionalGuests", form) || [];
  const latestPassportRef = useRef("");
  const [roomType, setRoomType] = useState(initialValues.roomType);
  const [guestType, setGuestType] = useState(initialValues.guestType);
  const mode = Form.useWatch("mode", form) || "checkin";
  const isBookingMode = mode === "booking";
  const [isBlacklistedPassport, setIsBlacklistedPassport] = useState(false);
  const rooms = useMemo(() => roomsData?.innerData || [], [roomsData]);
  const selectedRoom = useMemo(
    () => rooms.find((room) => room._id === selectedRoomId),
    [rooms, selectedRoomId],
  );
  const selectedRoomFreeSlots = useMemo(() => {
    if (!selectedRoom) return 0;
    return Math.max(
      Number(selectedRoom.capacity || 0) -
        Number(selectedRoom.activeGuestsCount || 0),
      0,
    );
  }, [selectedRoom]);
  const totalGuestsCount = 1 + additionalGuests.length;
  const canAddMoreGuests = selectedRoomFreeSlots > totalGuestsCount;

  const roomTypeAvailability = useMemo(() => {
    const availability = {};
    roomTypeOptions.forEach((option) => {
      const hasFreeRoom = rooms.some(
        (room) =>
          room.category === option.value &&
          room.status !== "remont" &&
          Number(room.capacity || 0) - Number(room.activeGuestsCount || 0) > 0,
      );
      availability[option.value] = hasFreeRoom;
    });
    return availability;
  }, [rooms]);

  const roomTypeSegmentOptions = useMemo(
    () =>
      roomTypeOptions.map((option) => ({
        ...option,
        disabled: !roomTypeAvailability[option.value],
      })),
    [roomTypeAvailability],
  );

  useEffect(() => {
    if (roomTypeAvailability[roomType]) return;
    const firstAvailable = roomTypeOptions.find(
      (option) => roomTypeAvailability[option.value],
    );
    if (!firstAvailable) return;

    setRoomType(firstAvailable.value);
    form.setFieldsValue({
      roomType: firstAvailable.value,
      room: undefined,
      dailyRate: 0,
    });
  }, [roomType, roomTypeAvailability, form]);

  const roomOptions = useMemo(() => {
    return rooms
      .filter((room) => room.category === roomType)
      .filter((room) => room.status !== "remont")
      .filter(
        (room) =>
          Number(room.capacity || 0) - Number(room.activeGuestsCount || 0) > 0,
      )
      .map((room) => ({
        label: `${room.roomNumber} [${room.category === "bir_kishilik" ? "1 kishilik" : room.category}] - Bo'sh joy: ${Math.max(
          Number(room.capacity || 0) - Number(room.activeGuestsCount || 0),
          0,
        )}/${Number(room.capacity || 0)} [${room.floor}-qavat]`,
        value: room._id,
      }));
  }, [rooms, roomType]);

  const onSubmit = async (values) => {
    const birthDateIso = parseUzDateToIso(values.birthDate);
    if (!birthDateIso) {
      toast.error("Tug'ilgan sana formati: dd.mm.yyyy");
      return;
    }

    const commonPayload = {
      guestType: values.guestType || "uzb",
      isBooking: isBookingMode,
      bookedForDate:
        isBookingMode && values.bookedForDate
          ? values.bookedForDate.format("YYYY-MM-DD")
          : undefined,
      room: values.room,
      dailyRate: Number(values.dailyRate || 0),
      stayDays: Number(values.stayDays || 1),
    };
    const firstGuest = {
      firstname: String(values.firstname || "").trim(),
      lastname: String(values.lastname || "").trim(),
      passport: String(values.passport || "").trim(),
      birthDate: birthDateIso,
      phone: String(values.phone || "").trim(),
      note: String(values.note || "").trim(),
      vip: isBookingMode ? false : Boolean(values.vip),
    };

    if (isBookingMode && !commonPayload.bookedForDate) {
      toast.error("Bron sanasini tanlang");
      return;
    }

    if (isBlacklistedPassport) {
      toast.error("Bu mijoz qora ro'yxatda. Qabul qilib bo'lmaydi");
      return;
    }

    try {
      if (additionalGuests.length > 0) {
        const extraGuests = [];
        for (const guest of additionalGuests) {
          const extraBirthDateIso = parseUzDateToIso(guest?.birthDate);
          if (!extraBirthDateIso) {
            toast.error("Yangi mehmon tug'ilgan sana formati: dd.mm.yyyy");
            return;
          }
          extraGuests.push({
            firstname: String(guest?.firstname || "").trim(),
            lastname: String(guest?.lastname || "").trim(),
            passport: String(guest?.passport || "").trim(),
            birthDate: extraBirthDateIso,
            phone: String(guest?.phone || "").trim(),
            note: String(guest?.note || "").trim(),
            vip: false,
          });
        }
        const bulkPayload = {
          ...commonPayload,
          guests: [firstGuest, ...extraGuests],
        };
        const result = await createGuestsBulk(bulkPayload).unwrap();
        toast.success(
          result?.message ||
            `${1 + extraGuests.length} ta mehmon muvaffaqiyatli saqlandi`,
        );
      } else {
        const result = await createGuest({
          ...commonPayload,
          ...firstGuest,
        }).unwrap();
        toast.success(
          result?.message ||
            (isBookingMode ? "Mehmon bron qilindi" : "Mehmon qabul qilindi"),
        );
      }
      form.resetFields();
      setIsBlacklistedPassport(false);
    } catch (err) {
      const backendErrors = err?.data?.innerData;
      if (Array.isArray(backendErrors) && backendErrors.length) {
        toast.error(backendErrors[0]);
      } else {
        toast.error(err?.data?.message || "Saqlashda xatolik");
      }
    }
  };

  useEffect(() => {
    if (!selectedRoomId || selectedRoomFreeSlots <= 1) return;
    if (additionalGuests.length <= selectedRoomFreeSlots - 1) return;
    form.setFieldValue(
      "additionalGuests",
      additionalGuests.slice(0, selectedRoomFreeSlots - 1),
    );
  }, [selectedRoomId, selectedRoomFreeSlots, additionalGuests, form]);

  const onSubmitFailed = ({ errorFields }) => {
    const firstError = errorFields?.[0]?.errors?.[0];
    toast.error(firstError || "Formani to'g'ri to'ldiring");
  };

  useEffect(() => {
    const passport = String(passportValue || "").trim();
    if (passport.length <= 5) {
      setIsBlacklistedPassport(false);
      return undefined;
    }

    latestPassportRef.current = passport;
    const timer = setTimeout(async () => {
      try {
        const result = await fetchGuestByPassport(passport).unwrap();
        if (latestPassportRef.current !== passport) return;

        const guest = result?.innerData;
        if (!guest) return;
        const blacklisted = Boolean(guest.isBlacklisted);
        setIsBlacklistedPassport(blacklisted);

        form.setFieldsValue({
          firstname: guest.firstname || "",
          lastname: guest.lastname || "",
          phone: guest.phone || "",
          birthDate: formatIsoToUzDate(guest.birthDate),
        });
        if (blacklisted) {
          toast.error("Bu mijoz qora ro'yxatda");
        }
      } catch (err) {
        if (err?.status === 404) {
          setIsBlacklistedPassport(false);
          return;
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [passportValue, fetchGuestByPassport, form]);

  return (
    <div className="checkin-modern">
      <div className="checkin-modern-card">
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={onSubmit}
          onFinishFailed={onSubmitFailed}
          requiredMark={false}
          className="checkin-modern-form"
        >
          <div className="checkin-grid-top">
            <Form.Item name="mode" label="Amal turi">
              <Segmented
                options={[
                  { label: "Qabul qilish", value: "checkin" },
                  { label: "Bron qilish", value: "booking" },
                ]}
                block
              />
            </Form.Item>
            <Form.Item name="roomType" label="Xona turi">
              <Segmented
                options={roomTypeSegmentOptions}
                value={roomType}
                onChange={(value) => {
                  if (!roomTypeAvailability[value]) return;
                  setRoomType(value);
                  form.setFieldsValue({
                    roomType: value,
                    room: undefined,
                    dailyRate: 0,
                  });
                }}
                block
              />
            </Form.Item>

            <Form.Item
              name="room"
              label="Xona raqami"
              rules={[{ required: true, message: "Xona majburiy" }]}
            >
              <Select
                placeholder="Xona tanlang"
                options={roomOptions}
                onChange={(value) => {
                  const selected = rooms.find((room) => room._id === value);
                  const currentGuestType =
                    form.getFieldValue("guestType") || "uzb";
                  const nextRate =
                    currentGuestType === "chetellik"
                      ? Number(selected?.prices?.chetEllik || 0)
                      : Number(selected?.prices?.oddiy || 0);
                  form.setFieldsValue({
                    room: value,
                    dailyRate: nextRate,
                  });
                }}
              />
            </Form.Item>

            <Form.Item name="guestType" label="Mehmon turi">
              <Segmented
                options={[
                  { label: "UZB", value: "uzb" },
                  { label: "Chet ellik", value: "chetellik" },
                ]}
                value={guestType}
                onChange={(value) => {
                  setGuestType(value);
                  const selectedRoomId = form.getFieldValue("room");
                  const selectedRoom = rooms.find(
                    (room) => room._id === selectedRoomId,
                  );
                  const nextRate =
                    value === "chetellik"
                      ? Number(selectedRoom?.prices?.chetEllik || 0)
                      : Number(selectedRoom?.prices?.oddiy || 0);
                  form.setFieldsValue({
                    guestType: value,
                    dailyRate: nextRate,
                  });
                }}
                block
              />
            </Form.Item>

            <Form.Item
              name="dailyRate"
              label="Kunlik narx"
              rules={[{ required: true, message: "Kunlik narx majburiy" }]}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                addonAfter="so'm"
                formatter={(value) =>
                  String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                }
                parser={(value) => String(value || "").replace(/[^\d]/g, "")}
                onKeyDown={blockNonNumericKeys}
              />
            </Form.Item>

            <div className="checkin-room-extra-block">
              <Form.Item
                name="stayDays"
                label="Necha kun qoladi"
                rules={[{ required: true, message: "Kunlar soni majburiy" }]}
              >
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                  addonAfter="kun"
                  parser={(value) => String(value || "").replace(/[^\d]/g, "")}
                  onKeyDown={blockNonNumericKeys}
                />
              </Form.Item>

              <div className="checkin-room-extra-second">
                {isBookingMode ? (
                  <Form.Item
                    name="bookedForDate"
                    label="Bron sanasi"
                    rules={[
                      { required: true, message: "Bron sanasi majburiy" },
                    ]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="DD.MM.YYYY"
                      placeholder="Sanani tanlang"
                      disabledDate={(current) =>
                        current && current.startOf("day").isBefore(dayjs().startOf("day"))
                      }
                    />
                  </Form.Item>
                ) : (
                  <Form.Item
                    name="vip"
                    label="VIP holati"
                    valuePropName="checked"
                    className="checkin-vip-item"
                  >
                    <Checkbox>VIP mehmon (to'lov olinmaydi)</Checkbox>
                  </Form.Item>
                )}
              </div>
            </div>
          </div>

          <div className="checkin-divider">
            <span>Mijoz ma'lumotlari</span>
          </div>

          <div className="checkin-grid-user">
            <Form.Item
              name="firstname"
              label="Ism"
              rules={[{ required: true, message: "Ism majburiy" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="lastname"
              label="Familiya"
              rules={[{ required: true, message: "Familiya majburiy" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="passport"
              label="Passport / Prava (ixtiyoriy)"
            >
              <Input placeholder="Passport yoki haydovchilik guvohnomasi" />
            </Form.Item>
            {isBlacklistedPassport ? (
              <div className="blacklist-warning">
                Bu mijoz qora ro'yxatda. Qabul qilish bloklangan.
              </div>
            ) : null}
            <Form.Item
              name="birthDate"
              label="Tug'ilgan sana"
              rules={[
                { required: true, message: "Sana majburiy" },
                {
                  pattern: /^\d{2}\.\d{2}\.\d{4}$/,
                  message: "Format: dd.mm.yyyy",
                },
              ]}
            >
              <Input
                placeholder="dd.mm.yyyy"
                maxLength={10}
                onChange={(e) =>
                  form.setFieldValue(
                    "birthDate",
                    normalizeUzDateInput(e.target.value),
                  )
                }
              />
            </Form.Item>
            <Form.Item name="phone" label="Telefon (ixtiyoriy)">
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="+998901234567"
                onChange={(e) =>
                  form.setFieldValue(
                    "phone",
                    normalizePhoneInput(e.target.value),
                  )
                }
              />
            </Form.Item>
          </div>
          <Form.Item name="note" label="Izoh">
            <Input.TextArea
              rows={2}
              style={{ resize: "none" }}
              placeholder="1-mehmon uchun eslatma"
            />
          </Form.Item>

          <Form.List name="additionalGuests">
            {(fields, { remove }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key}>
                    <div className="checkin-divider">
                      <span>Yangi mehmon {index + 2} ma'lumotlari</span>
                    </div>
                    <div className="checkin-grid-user">
                      <Form.Item
                        {...field}
                        name={[field.name, "firstname"]}
                        label="Ism"
                        rules={[{ required: true, message: "Ism majburiy" }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, "lastname"]}
                        label="Familiya"
                        rules={[{ required: true, message: "Familiya majburiy" }]}
                      >
                        <Input />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, "passport"]}
                        label="Passport / Prava (ixtiyoriy)"
                      >
                        <Input placeholder="Passport yoki haydovchilik guvohnomasi" />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, "birthDate"]}
                        label="Tug'ilgan sana"
                        rules={[
                          { required: true, message: "Sana majburiy" },
                          {
                            pattern: /^\d{2}\.\d{2}\.\d{4}$/,
                            message: "Format: dd.mm.yyyy",
                          },
                        ]}
                      >
                        <Input
                          placeholder="dd.mm.yyyy"
                          maxLength={10}
                          onChange={(e) => {
                            const normalized = normalizeUzDateInput(e.target.value);
                            form.setFieldValue(
                              ["additionalGuests", field.name, "birthDate"],
                              normalized,
                            );
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, "phone"]}
                        label="Telefon (ixtiyoriy)"
                      >
                        <Input
                          type="tel"
                          inputMode="numeric"
                          placeholder="+998901234567"
                          onChange={(e) => {
                            const normalized = normalizePhoneInput(e.target.value);
                            form.setFieldValue(
                              ["additionalGuests", field.name, "phone"],
                              normalized,
                            );
                          }}
                        />
                      </Form.Item>
                    </div>
                    <Form.Item
                      {...field}
                      name={[field.name, "note"]}
                      label={`Yangi mehmon ${index + 2} uchun izoh`}
                    >
                      <Input.TextArea rows={2} style={{ resize: "none" }} />
                    </Form.Item>
                    <div className="row-actions" style={{ marginBottom: 12 }}>
                      <Button danger onClick={() => remove(field.name)}>
                        Yangi mehmonni olib tashlash
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="row-actions" style={{ marginBottom: 12 }}>
                  <Button
                    type="dashed"
                    disabled={!selectedRoomId || !canAddMoreGuests}
                    onClick={() => {
                      const next = [...additionalGuests, {}];
                      form.setFieldValue("additionalGuests", next);
                    }}
                  >
                    + Yangi mehmon qo'shish
                  </Button>
                </div>
              </>
            )}
          </Form.List>

          <div className="row-actions">
            <Button
              htmlType="submit"
              loading={isLoading || isBulkLoading}
              className="hotel-primary-btn"
              disabled={isBlacklistedPassport}
            >
              {isBookingMode ? "Bron qilish" : "Qabul qilish"}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default GuestCheckinPage;
