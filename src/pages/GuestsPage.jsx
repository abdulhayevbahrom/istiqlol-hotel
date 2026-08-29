import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Segmented,
  Select,
  Tag,
} from "antd";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import {
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDownload,
  FiEdit2,
  FiLogOut,
  FiMoreVertical,
  FiPlus,
  FiPrinter,
  FiTrash2,
  FiXCircle,
  FiRefreshCw,
} from "react-icons/fi";
import {
  useAddGuestServiceMutation,
  useAddGuestPaymentMutation,
  useUpdateGuestPaymentMutation,
  useCheckoutGuestMutation,
  useContinueGuestStayMutation,
  useCheckoutGuestsBulkMutation,
  useDecideVipRequestMutation,
  useDeleteGuestMutation,
  useGetGuestsQuery,
  useLazyGetGuestsQuery,
  useGetRoomsQuery,
  useGetServicesQuery,
  useGetSettingsQuery,
  useGetVipRequestsQuery,
  useUpdateGuestMutation,
} from "../store/employeeApi";
import {
  blockNonIntegerKeys,
  preventInvalidAmountPaste,
} from "../utils/numberFormat";
import dayjs from "dayjs";

const getCurrentStayDay = (checkInAt, checkoutTime = "12:00") => {
  if (!checkInAt) return 1;
  const [checkoutHour = 12, checkoutMinute = 0] = String(checkoutTime)
    .split(":")
    .map(Number);
  const today = dayjs();
  const isBeforeCheckout = (value) =>
    value.hour() < checkoutHour ||
    (value.hour() === checkoutHour && value.minute() < checkoutMinute);
  const checkIn = dayjs(checkInAt);
  let checkInOperationalDay = checkIn.startOf("day");
  if (isBeforeCheckout(checkIn)) {
    checkInOperationalDay = checkInOperationalDay.subtract(1, "day");
  }
  let currentOperationalDay = today.startOf("day");
  if (isBeforeCheckout(today)) {
    currentOperationalDay = currentOperationalDay.subtract(1, "day");
  }
  return Math.max(
    currentOperationalDay.diff(checkInOperationalDay, "day") + 1,
    1,
  );
};

const getStayedDays = (checkInAt, checkOutAt, checkoutTime = "12:00") => {
  if (!checkInAt || !checkOutAt) return 1;
  const [checkoutHour = 12, checkoutMinute = 0] = String(checkoutTime)
    .split(":")
    .map(Number);
  const checkIn = dayjs(checkInAt);
  const checkOut = dayjs(checkOutAt);
  const isBeforeCheckout = (value) =>
    value.hour() < checkoutHour ||
    (value.hour() === checkoutHour && value.minute() < checkoutMinute);
  const isAtOrBeforeCheckout = (value) =>
    value.hour() < checkoutHour ||
    (value.hour() === checkoutHour && value.minute() <= checkoutMinute);
  let checkInOperationalDay = checkIn.startOf("day");
  if (isBeforeCheckout(checkIn)) {
    checkInOperationalDay = checkInOperationalDay.subtract(1, "day");
  }
  let checkOutOperationalDay = checkOut.startOf("day");
  if (isAtOrBeforeCheckout(checkOut)) {
    checkOutOperationalDay = checkOutOperationalDay.subtract(1, "day");
  }
  return Math.max(
    checkOutOperationalDay.diff(checkInOperationalDay, "day") + 1,
    1,
  );
};

const getDailyRateFields = (guest) => {
  const savedRates = new Map(
    (guest?.dailyRates || []).map((item) => [Number(item?.day), Number(item?.amount || 0)]),
  );
  const stayDays = Math.max(Number(guest?.stayDays || 1), 1);
  const defaultRate = Number(guest?.dailyRate || 0);
  return Array.from({ length: stayDays }, (_, index) => ({
    day: index + 1,
    amount: savedRates.has(index + 1) ? savedRates.get(index + 1) : defaultRate,
  }));
};
import {
  acquireSocketConnection,
  releaseSocketConnection,
} from "../config/socketConfig";
import PageLoader from "../components/PageLoader";

const { RangePicker } = DatePicker;
const GUESTS_PAGE_SIZE = 20;

const paymentTypeOptions = [
  { label: "Naqd", value: "naqd" },
  { label: "Bank", value: "bank" },
  { label: "Karta", value: "karta" },
];

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
};

const normalizePhoneInput = (value) => {
  const raw = String(value || "");
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  return `${hasPlus ? "+" : ""}${digits}`;
};

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("uz-UZ")} so'm`;

const getPayableAmount = (guest) =>
  Math.max(
    Number(guest?.payableAmount ?? guest?.debtAmount ?? 0),
    0,
  );

const formatActionBy = (actionBy) => {
  const firstname = String(actionBy?.firstname || "").trim();
  const lastname = String(actionBy?.lastname || "").trim();
  const fullName = `${firstname} ${lastname}`.trim();
  if (fullName) return fullName;
  return actionBy?.login || "-";
};

const formatRoomLabel = (room) => {
  if (!room) return "-";
  const roomNumber = room.roomNumber || "-";
  const korpus = room.korpus ? `${room.korpus} korpus` : "";
  const floor = room.floor ? `${room.floor}-qavat` : "";
  return [roomNumber, korpus, floor].filter(Boolean).join(" / ");
};

const VipRequestsPanel = memo(function VipRequestsPanel({
  vipRequests,
  decidingVip,
  vipDecisionState,
  onDecideVip,
}) {
  if (!vipRequests.length) return null;

  return (
    <div className="vip-requests-panel">
      <h3>Kutilayotgan VIP so'rovlar ({vipRequests.length})</h3>
      <div className="vip-requests-list">
        {vipRequests.map((request) => (
          <div className="vip-request-item" key={request._id}>
            <div className="vip-request-info">
              <strong>
                {request.guest?.firstname || ""} {request.guest?.lastname || ""}
              </strong>
              <span>
                Passport: {request.guest?.passport || "-"} | Xona:{" "}
                {formatRoomLabel(request.guest?.room)}
              </span>
            </div>
            <div className="vip-request-actions">
              <Button
                size="small"
                className="hotel-primary-btn"
                loading={
                  decidingVip &&
                  vipDecisionState.id === request._id &&
                  vipDecisionState.action === "approve"
                }
                disabled={decidingVip && vipDecisionState.id === request._id}
                onClick={() => onDecideVip(request._id, "approve")}
              >
                Tasdiqlash
              </Button>
              <Button
                size="small"
                danger
                loading={
                  decidingVip &&
                  vipDecisionState.id === request._id &&
                  vipDecisionState.action === "reject"
                }
                disabled={decidingVip && vipDecisionState.id === request._id}
                onClick={() => onDecideVip(request._id, "reject")}
              >
                Bekor
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

function GuestsPage({ tab = "active" }) {
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const { data: settingsData } = useGetSettingsQuery();
  const { data: roomsData } = useGetRoomsQuery();
  const hotelSettings = settingsData?.innerData || {};
  const hotelName = hotelSettings?.hotelName || "Mehmonxona nomi";
  const canDeleteGuest = true;
  const [paymentForm] = Form.useForm();
  const [serviceForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [paymentGuest, setPaymentGuest] = useState(null);
  const [selectedGuestIds, setSelectedGuestIds] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isMobileFilters, setIsMobileFilters] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 900 : false,
  );

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    query: "",
    guestType: "",
    vip: "",
    roomNumber: "",
    floor: "",
    category: "",
    startDate: "",
    endDate: "",
  });

  const shouldLoadVipRequests = tab === "active";
  const { data: vipRequestsData, refetch: refetchVipRequests } =
    useGetVipRequestsQuery("pending", {
      skip: !shouldLoadVipRequests,
    });

  const queryParams = useMemo(
    () => ({
      tab,
      page,
      limit: GUESTS_PAGE_SIZE,
      ...filters,
    }),
    [tab, page, filters],
  );

  const {
    data: guestsData,
    isLoading,
    isFetching,
    refetch: refetchGuests,
  } = useGetGuestsQuery(queryParams, {
    pollingInterval: 0,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  });
  const [fetchGuestsForExport, { isFetching: exportingDebtors }] =
    useLazyGetGuestsQuery();
  const shouldShowGuestsLoading = isLoading || isFetching;
  const rooms = roomsData?.innerData || [];
  const roomEditOptions = useMemo(
    () =>
      rooms.map((room) => ({
        value: room._id,
        label: formatRoomLabel(room),
      })),
    [rooms],
  );
  const guestsPayload = guestsData?.innerData || { items: [], pagination: {} };
  const guests = guestsPayload.items || [];
  const pagination = guestsPayload.pagination || {
    page: 1,
    total: 0,
    limit: GUESTS_PAGE_SIZE,
  };
  const guestsPageSize = Number(pagination.limit || GUESTS_PAGE_SIZE);
  const shouldShowPagination = Number(pagination.total || 0) > guestsPageSize;
  const filterOptions = guestsPayload.filterOptions || {
    floors: [],
    roomNumbers: [],
    categories: [],
  };
  const roomNumberOptions = useMemo(
    () =>
      filterOptions.roomNumbers.map((value) => ({
        label: value,
        value,
      })),
    [filterOptions.roomNumbers],
  );
  const floorOptions = useMemo(
    () =>
      filterOptions.floors.map((value) => ({
        label: `${value}-qavat`,
        value: String(value),
      })),
    [filterOptions.floors],
  );
  const categoryOptions = useMemo(
    () =>
      filterOptions.categories.map((value) => ({
        label: value === "bir_kishilik" ? "1 Kishilik" : value,
        value,
      })),
    [filterOptions.categories],
  );
  const { data: servicesData } = useGetServicesQuery(true);
  const serviceOptions = useMemo(
    () =>
      (servicesData?.innerData || []).map((item) => ({
        label: `${item.name} (${Number(item.defaultPrice || 0).toLocaleString()} so'm)`,
        value: item._id,
        name: item.name,
        defaultPrice: Number(item.defaultPrice || 0),
      })),
    [servicesData],
  );

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    setSelectedGuestIds([]);
  }, [tab, page, filters]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = acquireSocketConnection(token);
    if (!socket) return undefined;
    let refreshTimer = null;

    const refreshGuests = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refetchGuests();
      }, 120);
    };

    const refreshVipAndGuests = () => {
      refetchGuests();
      if (shouldLoadVipRequests && typeof refetchVipRequests === "function") {
        refetchVipRequests();
      }
    };

    socket.on("vip_request_created", refreshVipAndGuests);
    socket.on("vip_request_updated", refreshVipAndGuests);
    socket.on("guest_updated", refreshGuests);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      socket.off("vip_request_created", refreshVipAndGuests);
      socket.off("vip_request_updated", refreshVipAndGuests);
      socket.off("guest_updated", refreshGuests);
      releaseSocketConnection(socket);
    };
  }, [token, refetchGuests, refetchVipRequests, shouldLoadVipRequests]);

  useEffect(() => {
    const handleResize = () => setIsMobileFilters(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const vipRequests = useMemo(
    () => vipRequestsData?.innerData || [],
    [vipRequestsData],
  );

  const [deleteGuest, { isLoading: deleting }] = useDeleteGuestMutation();
  const [addPayment, { isLoading: paying }] = useAddGuestPaymentMutation();
  const [updateGuestPayment, { isLoading: updatingPayment }] =
    useUpdateGuestPaymentMutation();
  const [addGuestService, { isLoading: savingService }] =
    useAddGuestServiceMutation();
  const [updateGuest, { isLoading: updating }] = useUpdateGuestMutation();
  const [checkoutGuest, { isLoading: checkingOut }] =
    useCheckoutGuestMutation();
  const [continueGuestStay, { isLoading: continuingStay }] =
    useContinueGuestStayMutation();
  const [checkoutGuestsBulk, { isLoading: bulkCheckingOut }] =
    useCheckoutGuestsBulkMutation();
  const [decideVipRequest, { isLoading: decidingVip }] =
    useDecideVipRequestMutation();

  const [vipDecisionState, setVipDecisionState] = useState({
    id: "",
    action: "",
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentGuestId, setPaymentGuestId] = useState("");
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceGuestId, setServiceGuestId] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editGuestId, setEditGuestId] = useState("");
  const [editGuestStatus, setEditGuestStatus] = useState("");
  const [editGuestCurrentDay, setEditGuestCurrentDay] = useState(0);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyGuest, setHistoryGuest] = useState(null);
  const [isPaymentEditModalOpen, setIsPaymentEditModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentEditForm] = Form.useForm();
  const [isContinueModalOpen, setIsContinueModalOpen] = useState(false);
  const [continuingGuest, setContinuingGuest] = useState(null);
  const [continueForm] = Form.useForm();
  const [receiptData, setReceiptData] = useState(null);
  const receiptRef = useRef(null);
  const [hotelReceiptData, setHotelReceiptData] = useState(null);
  const hotelReceiptRef = useRef(null);

  const printReceipt = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: "Tolov-check",
    pageStyle: `
      @page { size: 80mm auto; margin: 4mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });
  const printHotelReceipt = useReactToPrint({
    content: () => hotelReceiptRef.current,
    documentTitle: "Hotel-receipt",
    pageStyle: `
      @page { size: A4 portrait; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  const openPaymentModal = (guest) => {
    const payableAmount = getPayableAmount(guest);
    if (!guest || payableAmount <= 0) return;
    setPaymentGuest(guest);
    setPaymentGuestId(guest._id);
    paymentForm.setFieldsValue({
      amount: payableAmount,
      type: "naqd",
      note: "",
    });
    setIsPaymentModalOpen(true);
  };

  const openBulkPaymentModal = () => {
    const paymentGuests = activeSelectableGuests.filter(
      (guest) =>
        selectedGuestIds.includes(guest._id) &&
        !guest.vip &&
        getPayableAmount(guest) > 0,
    );
    if (!paymentGuests.length) {
      toast.error("To'lov uchun qarzdor mijozlarni tanlang");
      return;
    }
    const totalDebt = paymentGuests.reduce(
      (sum, guest) => sum + getPayableAmount(guest),
      0,
    );
    setPaymentGuest({
      bulk: true,
      guests: paymentGuests,
      debtAmount: totalDebt,
      firstname: `${paymentGuests.length} ta mijoz`,
      lastname: "",
    });
    setPaymentGuestId("");
    paymentForm.setFieldsValue({ amount: totalDebt, type: "naqd", note: "" });
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentGuestId("");
    paymentForm.resetFields();
    setPaymentGuest(null);
  };

  const openServiceModal = (guest) => {
    setServiceGuestId(guest._id);
    setIsServiceModalOpen(true);
    serviceForm.setFieldsValue({
      serviceId: undefined,
      price: 0,
      quantity: 1,
      note: "",
    });
  };

  const closeServiceModal = () => {
    setIsServiceModalOpen(false);
    setServiceGuestId("");
    serviceForm.resetFields();
  };

  const openEditModal = (guest) => {
    setEditGuestStatus(String(guest.status || ""));
    setEditGuestId(guest._id);
    setEditGuestCurrentDay(
      guest.status === "active"
        ? getCurrentStayDay(
            guest.checkInAt,
            hotelSettings?.checkoutTime || "12:00",
          )
        : 0,
    );
    editForm.setFieldsValue({
      firstname: guest.firstname || "",
      lastname: guest.lastname || "",
      passport: guest.passport || "",
      phone: guest.phone || "",
      email: guest.email || "",
      organization: guest.organization || "",
      room: guest.room?._id || guest.room || undefined,
      guestType: guest.guestType || "uzb",
      dailyRate: Number(guest.dailyRate || 0),
      dailyRates: getDailyRateFields(guest),
      stayDays: Number(guest.stayDays || 1),
      checkInAt: guest.checkInAt ? dayjs(guest.checkInAt) : null,
      checkOutAt: guest.checkOutAt ? dayjs(guest.checkOutAt) : null,
      bookedForAt: guest.bookedForAt ? dayjs(guest.bookedForAt) : null,
      isBlacklisted: Boolean(guest.isBlacklisted),
      note: guest.note || "",
      vip: false,
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditGuestId("");
    setEditGuestStatus("");
    setEditGuestCurrentDay(0);
    editForm.resetFields();
  };

  const applyBaseDailyRate = (value) => {
    const rate = Math.max(Number(value || 0), 0);
    const currentRates = editForm.getFieldValue("dailyRates") || [];
    editForm.setFieldValue(
      "dailyRates",
      currentRates.map((item, index) => ({
        day: Number(item?.day || index + 1),
        amount: rate,
      })),
    );
  };

  const openHistoryModal = (guest) => {
    setHistoryGuest(guest);
    setIsHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setHistoryGuest(null);
    setIsHistoryModalOpen(false);
  };

  const openPaymentEditModal = (payment, index) => {
    if (!historyGuest) return;
    setEditingPayment({
      index,
      payment,
      guestId: historyGuest._id,
    });
    paymentEditForm.setFieldsValue({
      amount: Number(payment?.amount || 0),
      type: payment?.type || "naqd",
      note: payment?.note || "",
    });
    setIsPaymentEditModalOpen(true);
  };

  const closePaymentEditModal = () => {
    setIsPaymentEditModalOpen(false);
    setEditingPayment(null);
    paymentEditForm.resetFields();
  };

  const onPaymentSubmit = async (values) => {
    try {
      const payableAmount = getPayableAmount(paymentGuest);
      if (payableAmount <= 0) {
        toast.error("To'lanishi mumkin bo'lgan summa mavjud emas");
        return;
      }
      const paymentAmount = Number(values.amount || 0);
      if (paymentAmount > payableAmount) {
        toast.error("To'lov rejalashtirilgan umumiy summadan oshmasin");
        return;
      }
      if (paymentGuest?.bulk) {
        let remaining = paymentAmount;
        const unpaidGuests = paymentGuest.guests.filter(
          (guest) => getPayableAmount(guest) > 0,
        );
        for (let index = 0; index < unpaidGuests.length; index += 1) {
          const guest = unpaidGuests[index];
          const guestDebt = getPayableAmount(guest);
          const remainingGuests = unpaidGuests.length - index;
          const equalShare = Math.floor(remaining / remainingGuests);
          const guestPayment = Math.min(
            guestDebt,
            index === unpaidGuests.length - 1 ? remaining : equalShare,
          );
          if (guestPayment <= 0) continue;
          await addPayment({
            id: guest._id,
            amount: guestPayment,
            type: values.type,
            note: String(values.note || "").trim() || "Umumiy to'lov",
          }).unwrap();
          remaining -= guestPayment;
          if (remaining <= 0) break;
        }
        toast.success("Umumiy to'lov mijozlarga taqsimlandi");
        closePaymentModal();
        setSelectedGuestIds([]);
        return;
      }
      const result = await addPayment({
        id: paymentGuestId,
        amount: paymentAmount,
        type: values.type,
        note: String(values.note || "").trim(),
      }).unwrap();
      const updatedGuest = result?.innerData || null;
      const lastPayment =
        updatedGuest?.payments?.[updatedGuest.payments.length - 1] || null;
      setReceiptData({
        guestName:
          `${updatedGuest?.firstname || paymentGuest?.firstname || ""} ${updatedGuest?.lastname || paymentGuest?.lastname || ""}`.trim(),
        roomNumber:
          updatedGuest?.room?.roomNumber ||
          paymentGuest?.room?.roomNumber ||
          "-",
        paymentType: values.type,
        amount: paymentAmount,
        remainingDebt: Number(updatedGuest?.debtAmount || 0),
        note: String(values.note || "").trim(),
        createdAt: lastPayment?.createdAt || new Date().toISOString(),
        cashier:
          `${user?.firstname || ""} ${user?.lastname || ""}`.trim() ||
          user?.login ||
          "-",
      });
      toast.success(result?.message || "To'lov qo'shildi");
      closePaymentModal();
      setTimeout(() => {
        printReceipt();
      }, 200);
    } catch (err) {
      toast.error(err?.data?.message || "To'lovda xatolik");
    }
  };

  const onPaymentEditSubmit = async (values) => {
    try {
      if (!editingPayment?.guestId && editingPayment?.index !== 0) {
        toast.error("To'lov topilmadi");
        return;
      }
      const result = await updateGuestPayment({
        id: editingPayment.guestId,
        paymentIndex: editingPayment.index,
        amount: Number(values.amount || 0),
        type: values.type,
        note: String(values.note || "").trim(),
      }).unwrap();
      setHistoryGuest(result?.innerData || historyGuest);
      refetchGuests();
      toast.success(result?.message || "To'lov yangilandi");
      closePaymentEditModal();
    } catch (err) {
      toast.error(err?.data?.message || "To'lovni tahrirlashda xatolik");
    }
  };

  const onCheckout = async (id) => {
    try {
      const result = await checkoutGuest(id).unwrap();
      toast.success(result?.message || "Checkout qilindi");
    } catch (err) {
      toast.error(err?.data?.message || "Checkoutda xatolik");
    }
  };

  const onBulkCheckout = async () => {
    if (!selectedGuestIds.length) {
      toast.info("Kamida 1 ta mehmonni tanlang");
      return;
    }

    try {
      const result = await checkoutGuestsBulk({ ids: selectedGuestIds }).unwrap();
      toast.success(result?.message || "Tanlangan mehmonlar checkout qilindi");
      setSelectedGuestIds([]);
    } catch (err) {
      toast.error(err?.data?.message || "Bulk checkoutda xatolik");
    }
  };

  const onServiceSubmit = async (values) => {
    try {
      const selectedService = serviceOptions.find(
        (item) => item.value === values.serviceId,
      );
      const payload = {
        id: serviceGuestId,
        serviceId: values.serviceId,
        name: selectedService?.name || "",
        price: Number(selectedService?.defaultPrice || 0),
        quantity: Number(values.quantity || 1),
        note: String(values.note || "").trim(),
      };
      const result = await addGuestService(payload).unwrap();
      toast.success(result?.message || "Xizmat qo'shildi");
      closeServiceModal();
    } catch (err) {
      toast.error(err?.data?.message || "Xizmat qo'shishda xatolik");
    }
  };

  const onDelete = async (id) => {
    try {
      const result = await deleteGuest(id).unwrap();
      toast.success(result?.message || "Mehmon o'chirildi");
    } catch (err) {
      toast.error(err?.data?.message || "O'chirishda xatolik");
    }
  };

  const onDecideVip = useCallback(
    async (requestId, action) => {
      setVipDecisionState({ id: requestId, action });
      try {
        const result = await decideVipRequest({
          id: requestId,
          action,
        }).unwrap();
        toast.success(result?.message || "VIP so'rov yangilandi");
      } catch (err) {
        toast.error(err?.data?.message || "VIP so'rovni yangilashda xatolik");
      } finally {
        setVipDecisionState({ id: "", action: "" });
      }
    },
    [decideVipRequest],
  );

  const onEditSubmit = async (values) => {
    try {
      const payload = {
        id: editGuestId,
        firstname: String(values.firstname || "").trim(),
        lastname: String(values.lastname || "").trim(),
        passport: String(values.passport || "").trim(),
        phone: String(values.phone || "").trim(),
        email: String(values.email || "").trim(),
        organization: String(values.organization || "").trim(),
        room: values.room,
        guestType: values.guestType || "uzb",
        dailyRate: Number(values.dailyRate || 0),
        dailyRates: (values.dailyRates || []).map((item, index) => ({
          day: Number(item?.day || index + 1),
          amount: Number(item?.amount || 0),
        })),
        stayDays: Number(values.stayDays || 1),
        note: String(values.note || "").trim(),
        isBlacklisted: Boolean(values.isBlacklisted),
        checkInAt: values.checkInAt ? values.checkInAt.toISOString() : undefined,
      };
      if (editGuestStatus === "checked_out" && values.checkOutAt) {
        payload.checkOutAt = values.checkOutAt.toISOString();
      }
      if (editGuestStatus === "booked" && values.bookedForAt) {
        payload.bookedForAt = values.bookedForAt.format("YYYY-MM-DD");
      }

      if (values.vip === true) payload.vip = true;

      const result = await updateGuest(payload).unwrap();
      toast.success(result?.message || "Mehmon ma'lumotlari yangilandi");
      closeEditModal();
    } catch (err) {
      toast.error(err?.data?.message || "Yangilashda xatolik");
    }
  };

  const onFilterChange = useCallback((next) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);
  const onPrintHotelReceipt = (guest) => {
    if (!guest) return;
    setHotelReceiptData({
      ...guest,
      printedAt: new Date().toISOString(),
      totalPaid: Number(guest.paidAmount || 0),
    });
    setTimeout(() => {
      printHotelReceipt();
    }, 120);
  };

  const openContinueModal = (guest) => {
    setContinuingGuest(guest);
    continueForm.setFieldsValue({ additionalDays: 1 });
    setIsContinueModalOpen(true);
  };

  const closeContinueModal = () => {
    setIsContinueModalOpen(false);
    setContinuingGuest(null);
    continueForm.resetFields();
  };

  const onContinueGuestStay = async (values) => {
    if (!continuingGuest?._id) return;
    try {
      const result = await continueGuestStay({
        id: continuingGuest._id,
        additionalDays: Number(values.additionalDays || 1),
      }).unwrap();
      toast.success(
        result?.message || "Mijozning yashash jarayoni davom ettirildi",
      );
      closeContinueModal();
    } catch (err) {
      toast.error(err?.data?.message || "Jarayonni davom ettirishda xatolik");
    }
  };
  const onExportDebtorsExcel = useCallback(async () => {
    try {
      const limit = 100;
      let nextPage = 1;
      let totalPages = 1;
      const allDebtors = [];

      do {
        const result = await fetchGuestsForExport({
          tab: "debtors",
          page: nextPage,
          limit,
          ...filters,
        }).unwrap();
        const payload = result?.innerData || {};
        allDebtors.push(...(payload.items || []));
        totalPages = Number(payload.pagination?.totalPages || 1);
        nextPage += 1;
      } while (nextPage <= totalPages);

      if (!allDebtors.length) {
        toast.info("Qarzdorlar ro'yxati bo'sh");
        return;
      }

      const debtorRows = allDebtors.map((guest, index) => ({
        "T/r": index + 1,
        "F.I.SH": `${guest.firstname || ""} ${guest.lastname || ""}`.trim(),
        Passport: guest.passport || "",
        Telefon: guest.phone || "",
        "Mehmon turi": guest.guestType === "chetellik" ? "Chet ellik" : "UZB",
        VIP: guest.vip ? "Ha" : "Yo'q",
        Xona: formatRoomLabel(guest.room),
        "Xona turi":
          guest.room?.category === "bir_kishilik"
            ? "1 Kishilik"
            : guest.room?.category || "",
        "Kunlar (hisob / yashash)": `${guest.billableDays || guest.stayDays || 1} / ${guest.stayDays || 1}`,
        "Kunlik narx": formatMoney(guest.dailyRate),
        "Jami summa": formatMoney(guest.totalAmount),
        "To'langan summa": formatMoney(guest.paidAmount),
        "Qarz summa": formatMoney(guest.debtAmount),
        "Kelgan sana": formatDateTime(guest.checkInAt),
        "Chiqish sanasi": formatDateTime(guest.checkOutAt),
        "Qabul qilgan": formatActionBy(guest.acceptedBy),
        Chiqargan: formatActionBy(guest.checkoutBy),
        Izoh: guest.note || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(debtorRows, {
        skipHeader: false,
      });
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 20 },
        { wch: 18 },
        { wch: 14 },
        { wch: 8 },
        { wch: 10 },
        { wch: 12 },
        { wch: 18 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 },
        { wch: 20 },
        { wch: 30 },
      ];
      worksheet["!autofilter"] = {
        ref:
          XLSX.utils.decode_range(worksheet["!ref"]).s.c >= 0
            ? worksheet["!ref"]
            : "A1",
      };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Qarzdorlar");
      const fileDate = dayjs().format("YYYY-MM-DD");
      XLSX.writeFile(workbook, `qarzdorlar-${fileDate}.xlsx`, {
        compression: true,
      });
      toast.success(`${allDebtors.length} ta qarzdor XLSX faylga yuklandi`);
    } catch (err) {
      toast.error(err?.data?.message || "Excel yuklab olishda xatolik");
    }
  }, [fetchGuestsForExport, filters]);
  const paymentDebtMax = getPayableAmount(paymentGuest);
  const debtorsActionsMenu = useMemo(
    () => ({
      items: [
        {
          key: "export-xlsx",
          icon: <FiDownload size={15} />,
          label: exportingDebtors ? "Yuklab olinmoqda..." : "Yuklab olish",
          disabled: exportingDebtors,
        },
      ],
      onClick: ({ key }) => {
        if (key === "export-xlsx" && !exportingDebtors) {
          onExportDebtorsExcel();
        }
      },
    }),
    [exportingDebtors, onExportDebtorsExcel],
  );
  const filterRangeValue = useMemo(() => {
    if (!filters.startDate && !filters.endDate) return null;
    const start = filters.startDate ? dayjs(filters.startDate) : null;
    const end = filters.endDate ? dayjs(filters.endDate) : null;
    if (start && end && start.isValid() && end.isValid()) return [start, end];
    return null;
  }, [filters.endDate, filters.startDate]);
  const checkoutSelectableGuests = useMemo(
    () =>
      guests.filter(
        (guest) => guest.status === "active" || (guest.status === "booked" && guest.group),
      ),
    [guests],
  );
  const selectedGuestCount = selectedGuestIds.length;
  const selectedPaymentGuests = useMemo(
    () =>
      checkoutSelectableGuests.filter(
        (guest) => guest.status === "active" && selectedGuestIds.includes(guest._id),
      ),
    [checkoutSelectableGuests, selectedGuestIds],
  );
  const hasBookedGroupGuestsSelected = selectedPaymentGuests.length !== selectedGuestIds.length;
  const selectedRoomIds = new Set(
    selectedPaymentGuests.map((guest) => String(guest.room?._id || guest.room || "")),
  );
  const hasGuestsFromMultipleRooms = selectedRoomIds.size > 1;
  const allVisibleSelected =
    tab === "active" &&
    checkoutSelectableGuests.length > 0 &&
    checkoutSelectableGuests.every((guest) => selectedGuestIds.includes(guest._id));

  return (
    <div className="employee-page guests-page">
      <div className="page-card guests-page-card">
        {shouldLoadVipRequests ? (
          <VipRequestsPanel
            vipRequests={vipRequests}
            decidingVip={decidingVip}
            vipDecisionState={vipDecisionState}
            onDecideVip={onDecideVip}
          />
        ) : null}

        <div className="guests-top-filters">
          <div
            className={`guests-filter-grid ${isMobileFilters ? "guests-filter-grid-compact" : ""}`}
          >
            <div className="search-filter-group">
              {isMobileFilters ? (
                <button
                  type="button"
                  className="filter-trigger-btn"
                  aria-label="Filtrlarni ochish"
                  title="Filtrlar"
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none">
                    <path
                      d="M4 6H20M7 12H17M10 18H14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              ) : null}
              <Input
                placeholder="Ism/Familiya/Passport/Xona"
                value={filters.query}
                onChange={(e) => onFilterChange({ query: e.target.value })}
              />
            </div>
            {!isMobileFilters ? (
              <>
                <Select
                  allowClear
                  placeholder="UZB/Chetellik"
                  value={filters.guestType || undefined}
                  options={[
                    { label: "UZB", value: "uzb" },
                    { label: "Chet ellik", value: "chetellik" },
                  ]}
                  onChange={(value) => onFilterChange({ guestType: value || "" })}
                />
                <Select
                  allowClear
                  placeholder="VIP/Oddiy"
                  value={filters.vip || undefined}
                  options={[
                    { label: "VIP", value: "true" },
                    { label: "Oddiy", value: "false" },
                  ]}
                  onChange={(value) => onFilterChange({ vip: value || "" })}
                />
                <Select
                  allowClear
                  placeholder="Xona raqami"
                  value={filters.roomNumber || undefined}
                  options={roomNumberOptions}
                  onChange={(value) => onFilterChange({ roomNumber: value || "" })}
                />
                <Select
                  allowClear
                  placeholder="Qavat"
                  value={filters.floor || undefined}
                  options={floorOptions}
                  onChange={(value) => onFilterChange({ floor: value || "" })}
                />
                <Select
                  allowClear
                  placeholder="Kategoriya"
                  value={filters.category || undefined}
                  options={categoryOptions}
                  onChange={(value) => onFilterChange({ category: value || "" })}
                />
                <RangePicker
                  style={{ width: "100%" }}
                  value={filterRangeValue}
                  placeholder={["Dan", "Gacha"]}
                  format="YYYY-MM-DD"
                  onChange={(values) =>
                    onFilterChange({
                      startDate: values?.[0] ? values[0].format("YYYY-MM-DD") : "",
                      endDate: values?.[1] ? values[1].format("YYYY-MM-DD") : "",
                    })
                  }
                />
              </>
            ) : null}
            {tab === "debtors" ? (
              <div className="guests-filter-actions">
                <Dropdown
                  menu={debtorsActionsMenu}
                  trigger={["click"]}
                  placement="bottomRight"
                >
                  <Button
                    className="guests-more-btn"
                    icon={<FiMoreVertical size={16} />}
                    loading={exportingDebtors}
                    aria-label="Qo'shimcha amallar"
                  />
                </Dropdown>
              </div>
            ) : null}
          </div>
        </div>

        {shouldShowGuestsLoading ? (
          <PageLoader />
        ) : (
          <>
            {tab === "active" ? (
              <div className="guests-bulk-actions">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={
                    selectedGuestCount > 0 && !allVisibleSelected
                  }
                  onChange={(e) => {
                    setSelectedGuestIds(
                      e.target.checked
                        ? checkoutSelectableGuests.map((guest) => guest._id)
                        : [],
                    );
                  }}
                >
                  Barchasi  |
                  <span className="guests-bulk-count">
                    Jami: {pagination.total || 0}
                  </span>
                </Checkbox>
                <div style={{display: "flex", gap: "10px"}}>
                <Button
                  className="hotel-primary-btn"
                  loading={bulkCheckingOut}
                  disabled={!selectedGuestIds.length}
                  onClick={onBulkCheckout}
                  >
                  Checkout qilish ({selectedGuestIds.length})
                </Button>
                <Button
                  className="hotel-primary-btn"
                  disabled={
                    !selectedGuestIds.length ||
                    hasBookedGroupGuestsSelected ||
                    hasGuestsFromMultipleRooms ||
                    paying
                  }
                  title={
                    hasBookedGroupGuestsSelected
                      ? "Guruh bronlari uchun to'lov Guruhlar bo'limida qilinadi"
                      : hasGuestsFromMultipleRooms
                      ? "Umumiy to'lov faqat bitta xonadagi mijozlar uchun"
                      : "Umumiy to'lov"
                  }
                  onClick={openBulkPaymentModal}
                >
                  Umumiy to'lov
                </Button>
                  </div>
              </div>
            ) : null}
            <div className="table-wrap guests-table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    {tab === "active" ? <th></th> : null}
                    <th>F.I.SH</th>
                    <th>Passport</th>
                    <th>Xona</th>
                    <th>{tab === "history" ? "Kunlar" : "Yashash muddati"}</th>
                    <th>Kunlik</th>
                    <th>Jami</th>
                    <th>To'langan</th>
                    <th>Qarz</th>
                    <th>Kelgan sana</th>
                    {tab === "history" ? <th>Chiqqan sana</th> : null}
                    {tab === "history" ? <th>Qabul qilgan</th> : null}
                    {tab === "history" ? <th>Chiqargan</th> : null}
                    {tab === "active" ? <th>Eslatma</th> : null}
                    <th>Turi</th>
                    <th>VIP</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {guests.map((guest) => (
                    <tr key={guest._id}>
                      {tab === "active" ? (
                        <td data-label="Tanlash">
                          <Checkbox
                            checked={selectedGuestIds.includes(guest._id)}
                            onChange={(e) => {
                              setSelectedGuestIds((prev) =>
                                e.target.checked
                                  ? [...new Set([...prev, guest._id])]
                                  : prev.filter((id) => id !== guest._id),
                              );
                            }}
                            disabled={
                              guest.status !== "active" &&
                              !(guest.status === "booked" && guest.group)
                            }
                          />
                        </td>
                      ) : null}
                      <td data-label="F.I.SH">
                        <div className="guest-name-cell">
                          <strong>
                            {guest.firstname} {guest.lastname}
                          </strong>
                          {guest.email ? (
                            <small>{guest.email}</small>
                          ) : null}
                          {guest.group ? (
                            <Tag color="cyan">Guruh: {guest.group.name}</Tag>
                          ) : null}
                        </div>
                      </td>
                      <td data-label="Passport">{guest.passport}</td>
                      <td data-label="Xona">
                        <b>{guest.room?.roomNumber || "-"}</b>
                        <br />
                        <span className="room-floor">
                          {guest.room?.korpus
                            ? `${guest.room.korpus}`
                            : "-"}
                          {guest.room?.floor ? ` · ${guest.room.floor}-qavat` : ""}
                        </span>
                      </td>
                      <td data-label={tab === "history" ? "Kunlar" : "Yashash muddati"}>
                        <div className="guest-days-cell">
                          <strong>
                            {tab === "history"
                              ? getStayedDays(
                                  guest.checkInAt,
                                  guest.checkOutAt,
                                  hotelSettings?.checkoutTime || "12:00",
                                )
                              : guest.stayDays || 1} kun
                          </strong>
                          <small>
                            {tab === "history"
                              ? ""
                              : `Bugun ${getCurrentStayDay(
                                  guest.checkInAt,
                                  hotelSettings?.checkoutTime || "12:00",
                                )}-kun`}
                          </small>
                        </div>
                      </td>
                      <td data-label="Kunlik">
                        {Number(
                          tab === "active"
                            ? guest.currentDailyRate ?? guest.dailyRate
                            : guest.dailyRate || 0,
                        ).toLocaleString()}
                      </td>
                      <td data-label="Jami">
                        {Number(guest.totalAmount || 0).toLocaleString()}
                      </td>
                      <td data-label="To'langan">
                        {Number(guest.paidAmount || 0).toLocaleString()}
                      </td>
                      <td data-label="Qarz">
                        {Number(guest.debtAmount || 0).toLocaleString()}
                      </td>

                      <td className="guest-date-time" data-label="Kelgan sana">
                        {formatDateTime(guest.checkInAt)}
                      </td>
                      {tab === "history" ? (
                        <td className="guest-date-time" data-label="Chiqqan sana">
                          {formatDateTime(guest.checkOutAt)}
                        </td>
                      ) : null}
                      {tab === "history" ? (
                        <td data-label="Qabul qilgan">
                          {formatActionBy(guest.acceptedBy)}
                        </td>
                      ) : null}
                      {tab === "history" ? (
                        <td data-label="Chiqargan">
                          {formatActionBy(guest.checkoutBy)}
                        </td>
                      ) : null}
                      {tab === "active" ? (
                        <td data-label="Eslatma">
                          {guest.status === "booked" ? (
                            <Tag color="blue">Bron qilingan</Tag>
                          ) : guest.isCheckoutOverdue ? (
                            <Tag color="red">Muddat o'tgan</Tag>
                          ) : guest.isCheckoutReminderTime ? (
                            <Tag color="red">
                              {hotelSettings?.reminderTime || "12:00"}-
                              {hotelSettings?.checkoutTime || "15:00"}{" "}
                              ogohlantirish
                            </Tag>
                          ) : (
                            <Tag color="green">Faol</Tag>
                          )}
                        </td>
                      ) : null}

                      <td data-label="Turi">
                        <span
                          className={`guest-pill ${guest.guestType === "chetellik" ? "guest-pill-foreign" : "guest-pill-local"}`}
                        >
                          {guest.guestType === "chetellik"
                            ? "Chet ellik"
                            : "UZB"}
                        </span>
                      </td>
                      <td data-label="VIP">
                        <span
                          className={`guest-pill ${guest.vip ? "guest-pill-vip" : "guest-pill-regular"}`}
                        >
                          {guest.vip ? (
                            <FiCheckCircle className="vip-state-icon vip-state-yes" />
                          ) : (
                            <FiXCircle className="vip-state-icon vip-state-no" />
                          )}
                        </span>
                      </td>
                      <td data-label="Amal">
                        <div className="table-action-wrap">
                          <button
                            className="icon-btn"
                            onClick={() => openEditModal(guest)}
                            title="Tahrirlash"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          {tab === "debtors" || tab === "active" ? (
                            <button
                              className="icon-btn"
                              onClick={() => openPaymentModal(guest)}
                              title={
                                guest.vip
                                  ? "VIP mehmon uchun to'lov olinmaydi"
                                  : "To'lov"
                              }
                              disabled={
                                guest.vip || getPayableAmount(guest) <= 0
                              }
                            >
                              <FiCreditCard size={16} />
                            </button>
                          ) : null}
                          {guest.status !== "checked_out" ? (
                            <button
                              className="icon-btn"
                              onClick={() => openServiceModal(guest)}
                              title="Xizmat qo'shish"
                            >
                              <FiPlus size={17} />
                            </button>
                          ) : null}
                          {guest.status !== "checked_out" ? (
                            <>
                              {/* <button
                                className="icon-btn"
                                onClick={() => openPaymentModal(guest)}
                                title={
                                  guest.vip
                                    ? "VIP mehmon uchun to'lov olinmaydi"
                                    : "To'lov"
                                }
                                disabled={
                                  guest.vip ||
                                  getPayableAmount(guest) <= 0
                                }
                              >
                                <FiCreditCard size={16} />
                              </button> */}
                              {tab === "active" ? (
                                <Popconfirm
                                  title="Mehmonni chiqarish"
                                  description="Xona avtomatik bo'sh holatga qaytadi"
                                  okText="Chiqarish"
                                  cancelText="Bekor"
                                  okButtonProps={{ loading: checkingOut }}
                                  onConfirm={() => onCheckout(guest._id)}
                                  overlayClassName="hotel-popconfirm"
                                >
                                  <button className="icon-btn" title="Checkout">
                                    <FiLogOut size={16} />
                                  </button>
                                </Popconfirm>
                              ) : null}
                            </>
                          ) : null}
                          <button
                            className="icon-btn"
                            title={
                              (guest.payments || []).length ||
                              (guest.services || []).length
                                ? "Hisobot"
                                : "Hisobot yo'q"
                            }
                            disabled={
                              !(guest.payments || []).length &&
                              !(guest.services || []).length
                            }
                            onClick={() => openHistoryModal(guest)}
                          >
                            <FiClock size={16} />
                          </button>
                          {tab === "history" ? (
                            <button
                              className="icon-btn"
                              title="Jarayonni davom ettirish"
                              onClick={() => openContinueModal(guest)}
                            >
                              <FiRefreshCw size={16} />
                            </button>
                          ) : null}
                          {tab === "history" ? (
                            <button
                              className="icon-btn"
                              title="Hisobot"
                              onClick={() => onPrintHotelReceipt(guest)}
                            >
                              <FiPrinter size={16} />
                            </button>
                          ) : null}
                          {canDeleteGuest ? (
                            <Popconfirm
                              title="Mehmonni o'chirish"
                              description="Ushbu amalni tasdiqlaysizmi?"
                              okText="O'chirish"
                              cancelText="Bekor"
                              okButtonProps={{
                                danger: true,
                                loading: deleting,
                              }}
                              onConfirm={() => onDelete(guest._id)}
                              overlayClassName="hotel-popconfirm"
                            >
                              <button
                                className="icon-btn"
                                title="O'chirish"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </Popconfirm>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {guests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={tab === "history" ? 15 : tab === "active" ? 14 : 13}
                        className="table-empty"
                      >
                        Hech narsa topilmadi
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {shouldShowPagination ? (
              <div className="guests-pagination-wrap">
                <Pagination
                  current={pagination.page || page}
                  total={pagination.total || 0}
                  pageSize={guestsPageSize}
                  showSizeChanger={false}
                  onChange={(nextPage) => setPage(nextPage)}
                />
              </div>
            ) : null}
          </>
        )}
      </div>

      <Modal
        open={isFilterModalOpen}
        onCancel={() => setIsFilterModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={460}
        title="Filtrlar"
        rootClassName="room-filter-modal-theme"
      >
        <div className="room-filter-modal-body">
          <Select
            allowClear
            placeholder="UZB/Chetellik"
            value={filters.guestType || undefined}
            options={[
              { label: "UZB", value: "uzb" },
              { label: "Chet ellik", value: "chetellik" },
            ]}
            onChange={(value) => onFilterChange({ guestType: value || "" })}
          />
          <Select
            allowClear
            placeholder="VIP/Oddiy"
            value={filters.vip || undefined}
            options={[
              { label: "VIP", value: "true" },
              { label: "Oddiy", value: "false" },
            ]}
            onChange={(value) => onFilterChange({ vip: value || "" })}
          />
          <Select
            allowClear
            placeholder="Xona raqami"
            value={filters.roomNumber || undefined}
            options={roomNumberOptions}
            onChange={(value) => onFilterChange({ roomNumber: value || "" })}
          />
          <Select
            allowClear
            placeholder="Qavat"
            value={filters.floor || undefined}
            options={floorOptions}
            onChange={(value) => onFilterChange({ floor: value || "" })}
          />
          <Select
            allowClear
            placeholder="Kategoriya"
            value={filters.category || undefined}
            options={categoryOptions}
            onChange={(value) => onFilterChange({ category: value || "" })}
          />
          <RangePicker
            style={{ width: "100%" }}
            value={filterRangeValue}
            placeholder={["Dan", "Gacha"]}
            format="YYYY-MM-DD"
            onChange={(values) =>
              onFilterChange({
                startDate: values?.[0] ? values[0].format("YYYY-MM-DD") : "",
                endDate: values?.[1] ? values[1].format("YYYY-MM-DD") : "",
              })
            }
          />
          <div className="row-actions">
            <Button
              className="hotel-primary-btn"
              onClick={() => setIsFilterModalOpen(false)}
            >
              Qo'llash
            </Button>
            <Button
              onClick={() =>
                onFilterChange({
                  guestType: "",
                  vip: "",
                  roomNumber: "",
                  floor: "",
                  category: "",
                  startDate: "",
                  endDate: "",
                })
              }
            >
              Tozalash
            </Button>
          </div>
        </div>
      </Modal>

      {isPaymentModalOpen ? (
        <Modal
          open={isPaymentModalOpen}
          onCancel={closePaymentModal}
          footer={null}
          destroyOnHidden
          width={500}
          rootClassName="employee-modal-theme"
          title="To'lov qo'shish"
        >
          <Form
            form={paymentForm}
            layout="vertical"
            onFinish={onPaymentSubmit}
            requiredMark={false}
          >
            <Form.Item
              name="amount"
              label={paymentGuest?.bulk ? "Umumiy to'lov summasi" : "Summasi"}
              rules={[
                { required: true, message: "Summa majburiy" },
                () => ({
                  validator() {
                    const debtAmount = getPayableAmount(paymentGuest);
                    const value = Number(
                      paymentForm.getFieldValue("amount") || 0,
                    );
                    if (debtAmount > 0 && value > debtAmount) {
                      return Promise.reject(
                        new Error(
                          "To'lov rejalashtirilgan umumiy summadan oshmasin",
                        ),
                      );
                    }
                    return Promise.resolve();
                  },
                }),
                {
                  type: "number",
                  min: 1,
                  message: "Eng kamida 1 so'm kiriting",
                },
              ]}
            >
              <InputNumber
                min={1}
                precision={0}
                style={{ width: "100%" }}
                formatter={(value) =>
                  String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                }
                parser={(value) => {
                  const digits = String(value || "").replace(/[^\d]/g, "");
                  const withoutLeadingZeros = digits.replace(/^0+/, "");
                  if (!withoutLeadingZeros) return undefined;
                  const parsed = Number(withoutLeadingZeros);
                  if (!Number.isFinite(parsed)) return undefined;
                  if (paymentDebtMax > 0)
                    return Math.min(parsed, paymentDebtMax);
                  return parsed;
                }}
                onKeyDown={blockNonIntegerKeys}
                onPaste={preventInvalidAmountPaste}
                max={paymentDebtMax || undefined}
              />
            </Form.Item>
            <Form.Item
              name="type"
              label="To'lov turi"
              rules={[{ required: true, message: "To'lov turi majburiy" }]}
            >
              <Segmented
                options={paymentTypeOptions}
                block
                className="payment-type-segmented"
              />
            </Form.Item>
            <Form.Item name="note" label="Izoh">
              <Input.TextArea rows={3} />
            </Form.Item>
            <div className="row-actions">
              <Button
                htmlType="submit"
                loading={paying}
                className="hotel-primary-btn"
              >
                Saqlash
              </Button>
              <Button onClick={closePaymentModal}>Yopish</Button>
            </div>
          </Form>
        </Modal>
      ) : null}

      {isContinueModalOpen ? (
        <Modal
          open={isContinueModalOpen}
          onCancel={closeContinueModal}
          footer={null}
          destroyOnHidden
          width={480}
          rootClassName="employee-modal-theme"
          title="Yashash jarayonini davom ettirish"
        >
          <p>
            <b>
              {continuingGuest?.firstname || ""}{" "}
              {continuingGuest?.lastname || ""}
            </b>{" "}
            avvalgi yozuvi bilan davom etadi. To‘lovlar va xizmatlar saqlanadi.
          </p>
          <Form
            form={continueForm}
            layout="vertical"
            onFinish={onContinueGuestStay}
            requiredMark={false}
          >
            <Form.Item
              name="additionalDays"
              label="Qo‘shimcha qolish kunlari"
              rules={[
                { required: true, message: "Qo‘shimcha kunni kiriting" },
                {
                  type: "number",
                  min: 1,
                  max: 365,
                  message: "1 dan 365 kungacha kiriting",
                },
              ]}
            >
              <InputNumber
                min={1}
                max={365}
                precision={0}
                style={{ width: "100%" }}
                onKeyDown={blockNonIntegerKeys}
              />
            </Form.Item>
            <div className="row-actions">
              <Button
                htmlType="submit"
                loading={continuingStay}
                className="hotel-primary-btn"
              >
                Davom ettirish
              </Button>
              <Button onClick={closeContinueModal}>Bekor qilish</Button>
            </div>
          </Form>
        </Modal>
      ) : null}

      {isServiceModalOpen ? (
        <Modal
          open={isServiceModalOpen}
          onCancel={closeServiceModal}
          footer={null}
          destroyOnHidden
          width={520}
          rootClassName="employee-modal-theme"
          title="Mehmonga xizmat qo'shish"
        >
          <Form
            form={serviceForm}
            layout="vertical"
            onFinish={onServiceSubmit}
            requiredMark={false}
          >
            <Form.Item
              name="serviceId"
              label="Xizmat nomi"
              rules={[{ required: true, message: "Xizmat tanlash majburiy" }]}
            >
              <Select
                showSearch
                options={serviceOptions}
                placeholder="Xizmat tanlang"
                optionFilterProp="label"
                onChange={(value) => {
                  const selected = serviceOptions.find(
                    (item) => item.value === value,
                  );
                  serviceForm.setFieldsValue({
                    price: Number(selected?.defaultPrice || 0),
                  });
                }}
              />
            </Form.Item>
            <Form.Item
              name="price"
              label="Narx"
              rules={[{ required: true, message: "Narx majburiy" }]}
            >
              <InputNumber
                min={0}
                precision={0}
                style={{ width: "100%" }}
                disabled
              />
            </Form.Item>
            <Form.Item
              name="quantity"
              label="Soni"
              rules={[{ required: true, message: "Soni majburiy" }]}
            >
              <InputNumber min={1} precision={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="note" label="Izoh">
              <Input.TextArea rows={2} />
            </Form.Item>
            <div className="row-actions">
              <Button
                htmlType="submit"
                className="hotel-primary-btn"
                loading={savingService}
              >
                Saqlash
              </Button>
              <Button onClick={closeServiceModal}>Yopish</Button>
            </div>
          </Form>
        </Modal>
      ) : null}

      {isEditModalOpen ? (
        <Modal
          open={isEditModalOpen}
          onCancel={closeEditModal}
          footer={null}
          destroyOnHidden
          width={920}
          rootClassName="employee-modal-theme"
          title="Mehmonni tahrirlash"
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={onEditSubmit}
            requiredMark={false}
            className="guest-edit-form-grid"
          >
            <Form.Item
              name="firstname"
              label="Ism"
              rules={[
                { required: true, message: "Ism majburiy" },
                { min: 2, message: "Ism kamida 2 ta harf bo'lsin" },
              ]}
            >
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item
              name="lastname"
              label="Familiya"
              rules={[
                { required: true, message: "Familiya majburiy" },
                { min: 2, message: "Familiya kamida 2 ta harf bo'lsin" },
              ]}
            >
              <Input maxLength={50} />
            </Form.Item>
            <Form.Item
              name="passport"
              label="Passport / Prava"
              rules={[
                {
                  pattern: /^$|^[A-Za-z0-9-]{4,30}$/,
                  message: "Hujjat formati noto'g'ri",
                },
              ]}
            >
              <Input maxLength={30} placeholder="Ixtiyoriy" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Telefon"
              rules={[
                {
                  pattern: /^(|\+?\d{7,15})$/,
                  message: "Telefon formati noto'g'ri",
                },
              ]}
            >
              <Input
                placeholder="+998901234567"
                onChange={(e) =>
                  editForm.setFieldValue(
                    "phone",
                    normalizePhoneInput(e.target.value),
                  )
                }
              />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                {
                  type: "email",
                  message: "Email formati noto'g'ri",
                },
              ]}
            >
              <Input placeholder="name@example.com" />
            </Form.Item>
            <Form.Item name="organization" label="Tashkilot">
              <Input maxLength={120} placeholder="Ixtiyoriy" />
            </Form.Item>
            <Form.Item
              name="room"
              label="Xona"
              rules={[{ required: true, message: "Xona majburiy" }]}
            >
              <Select
                showSearch
                placeholder="Xona tanlang"
                options={roomEditOptions}
                filterOption={(input, option) =>
                  String(option?.label || "")
                    .toLowerCase()
                    .includes(String(input || "").toLowerCase())
                }
              />
            </Form.Item>
            <Form.Item
              name="guestType"
              label="Mehmon turi"
              rules={[{ required: true, message: "Mehmon turi majburiy" }]}
            >
              <Select
                options={[
                  { label: "UZB", value: "uzb" },
                  { label: "Chet ellik", value: "chetellik" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="dailyRate"
              label="Kunlik narx"
              rules={[{ required: true, message: "Kunlik narx majburiy" }]}
            >
              <InputNumber
                min={0}
                precision={0}
                style={{ width: "100%" }}
                formatter={(value) =>
                  String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                }
                parser={(value) => String(value || "").replace(/[^\d]/g, "")}
                onKeyDown={blockNonIntegerKeys}
                onChange={applyBaseDailyRate}
              />
            </Form.Item>
            <Form.Item
              name="stayDays"
              label={
                editGuestStatus === "checked_out"
                  ? "Qolish kuni (checkoutdan hisoblanadi)"
                  : "Qolish kuni"
              }
              rules={[{ required: true, message: "Kun majburiy" }]}
            >
              <InputNumber
                min={1}
                precision={0}
                disabled={editGuestStatus === "checked_out"}
                style={{ width: "100%" }}
                parser={(value) => String(value || "").replace(/[^\d]/g, "")}
                onKeyDown={blockNonIntegerKeys}
              />
            </Form.Item>
            <Form.List name="dailyRates">
              {(fields) => (
                <div className="guest-daily-rates">
                  <label>Kunlar bo'yicha narx</label>
                  {fields.map((field) => (
                    <div
                      className={`guest-daily-rate-row ${
                        Number(editForm.getFieldValue(["dailyRates", field.name, "day"]) || field.name + 1) === editGuestCurrentDay
                          ? "is-current-day"
                          : ""
                      }`}
                      key={field.key}
                    >
                      <span>
                        {editForm.getFieldValue(["dailyRates", field.name, "day"]) || field.name + 1}-kun
                        {Number(editForm.getFieldValue(["dailyRates", field.name, "day"]) || field.name + 1) === editGuestCurrentDay
                          ? " · Bugun"
                          : ""}
                      </span>
                      <Form.Item name={[field.name, "day"]} hidden><Input /></Form.Item>
                      <Form.Item
                        name={[field.name, "amount"]}
                        rules={[{ required: true, message: "Narx majburiy" }]}
                        noStyle
                      >
                        <InputNumber
                          min={0}
                          precision={0}
                          style={{ width: "100%" }}
                          formatter={(value) => String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                          parser={(value) => String(value || "").replace(/[^\d]/g, "")}
                          onKeyDown={blockNonIntegerKeys}
                          onChange={(value) =>
                            editForm.setFieldValue(
                              ["dailyRates", field.name, "amount"],
                              Number(value || 0),
                            )
                          }
                        />
                      </Form.Item>
                    </div>
                  ))}
                </div>
              )}
            </Form.List>
            <Form.Item
              name="checkInAt"
              label="Kelgan sana vaqti"
              rules={[{ required: true, message: "Kelgan sana vaqti majburiy" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                showTime={{ format: "HH:mm" }}
                format="DD.MM.YYYY HH:mm"
                allowClear={false}
              />
            </Form.Item>
            {editGuestStatus === "checked_out" ? (
              <Form.Item
                name="checkOutAt"
                label="Checkout sana vaqti"
                rules={[
                  { required: true, message: "Checkout sana vaqti majburiy" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const checkInAt = getFieldValue("checkInAt");
                      if (!value || !checkInAt || !value.isBefore(checkInAt)) {
                        if (value?.isAfter(dayjs())) {
                          return Promise.reject(
                            new Error(
                              "Checkout hozirgi vaqtdan keyin bo'lishi mumkin emas",
                            ),
                          );
                        }
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Checkout kelgan sanadan oldin bo'lishi mumkin emas"),
                      );
                    },
                  }),
                ]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  showTime={{ format: "HH:mm" }}
                  format="DD.MM.YYYY HH:mm"
                  allowClear={false}
                  disabledDate={(current) =>
                    current &&
                    current.startOf("day").isAfter(dayjs().startOf("day"))
                  }
                />
              </Form.Item>
            ) : null}
            {editGuestStatus === "booked" ? (
              <Form.Item
                name="bookedForAt"
                label="Bron sanasi"
                rules={[{ required: true, message: "Bron sanasi majburiy" }]}
              >
                <DatePicker
                  style={{ width: "100%" }}
                  format="DD.MM.YYYY"
                  disabledDate={(current) =>
                    current &&
                    current.startOf("day").isBefore(dayjs().startOf("day"))
                  }
                />
              </Form.Item>
            ) : null}
            <div className="guest-edit-flex-row guest-edit-note-full">
              <Form.Item name="vip" label=" " valuePropName="checked">
                <Checkbox>VIP so'rov yuborish</Checkbox>
              </Form.Item>
              <Form.Item
                name="isBlacklisted"
                label=" "
                valuePropName="checked"
              >
                <Checkbox>Qora ro'yxatga olish</Checkbox>
              </Form.Item>
            </div>
            <Form.Item
              name="note"
              label="Izoh"
              className="guest-edit-note-full"
            >
              <Input.TextArea rows={3} />
            </Form.Item>
            <div className="row-actions guest-edit-actions-full">
              <Button
                htmlType="submit"
                loading={updating}
                className="hotel-primary-btn"
              >
                Saqlash
              </Button>
              <Button onClick={closeEditModal}>Yopish</Button>
            </div>
          </Form>
        </Modal>
      ) : null}

      {isHistoryModalOpen ? (
        <Modal
          open={isHistoryModalOpen}
          onCancel={closeHistoryModal}
          footer={null}
          destroyOnHidden
          width={720}
          rootClassName="employee-modal-theme"
          title={
            <div className="guest-history-title">
              <strong>
                {historyGuest?.firstname || ""} {historyGuest?.lastname || ""}
              </strong>
              {historyGuest?.email ? <small>{historyGuest.email}</small> : null}
            </div>
          }
        >
          <div className="table-wrap history-payments-wrap">
            <table className="table history-payments-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sana</th>
                  <th>Turi</th>
                  <th>Summa</th>
                  <th>Izoh</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {(historyGuest?.payments || []).map((payment, index) => (
                  <tr key={`${payment.createdAt}-${index}`}>
                    <td data-label="#">{index + 1}</td>
                    <td data-label="Sana">{formatDateTime(payment.createdAt)}</td>
                    <td data-label="Turi">{payment.type}</td>
                    <td data-label="Summa">
                      {Number(payment.amount || 0).toLocaleString()}
                    </td>
                    <td data-label="Izoh">{payment.note || "-"}</td>
                    <td data-label="Amal">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => openPaymentEditModal(payment, index)}
                        title="To'lov turini tahrirlash"
                      >
                        <FiEdit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {(historyGuest?.payments || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-empty">
                      To'lov tarixi mavjud emas
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="row-actions" style={{ marginTop: 12 }}>
            <Button onClick={closeHistoryModal}>Yopish</Button>
          </div>
        </Modal>
      ) : null}

      {isPaymentEditModalOpen ? (
        <Modal
          open={isPaymentEditModalOpen}
          onCancel={closePaymentEditModal}
          footer={null}
          destroyOnHidden
          width={440}
          rootClassName="employee-modal-theme"
          title="To'lovni tahrirlash"
        >
          <Form
            form={paymentEditForm}
            layout="vertical"
            onFinish={onPaymentEditSubmit}
            requiredMark={false}
          >
            <Form.Item
              name="amount"
              label="To'lov summasi"
              rules={[{ required: true, message: "To'lov summasi majburiy" }]}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                addonAfter="so'm"
                formatter={(value) =>
                  String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                }
                parser={(value) => String(value || "").replace(/[^\d]/g, "")}
                onKeyDown={blockNonIntegerKeys}
              />
            </Form.Item>
            <Form.Item
              name="type"
              label="To'lov turi"
              rules={[{ required: true, message: "To'lov turi majburiy" }]}
            >
              <Segmented
                options={paymentTypeOptions}
                block
                className="payment-type-segmented"
              />
            </Form.Item>
            <Form.Item name="note" label="Izoh">
              <Input.TextArea rows={3} />
            </Form.Item>
            <div className="row-actions">
              <Button
                htmlType="submit"
                className="hotel-primary-btn"
                loading={updatingPayment}
              >
                Saqlash
              </Button>
              <Button onClick={closePaymentEditModal}>Yopish</Button>
            </div>
          </Form>
        </Modal>
      ) : null}

      {/* 80mm to'lov cheki uchun yashirin print blok */}
      <div style={{ position: "absolute", left: "-99999px", top: 0 }}>
        <div ref={receiptRef} className="payment-receipt-80mm">
          {hotelSettings?.logo ? (
            <div className="receipt-logo-wrap">
              <img
                src={hotelSettings.logo}
                alt="Hotel logo"
                className="receipt-logo"
              />
            </div>
          ) : null}
          <div className="receipt-title">{hotelName}</div>
          <div className="receipt-row">
            <span>Manzil:</span>
            <span>Namangan sh. Amir Temur ko'chasi</span>
          </div>
          <div className="receipt-row">
            <span>Telefon:</span>
            <span>+998 99 999 99 99</span>
          </div>
          <div className="receipt-subtitle">To'lov cheki</div>
          <div className="receipt-line" />
          <div className="receipt-row">
            <span>Mehmon:</span>
            <span>{receiptData?.guestName || "-"}</span>
          </div>
          <div className="receipt-row">
            <span>Xona:</span>
            <span>
              {receiptData?.roomNumber || "-"}
              {receiptData?.roomKorpus ? ` / ${receiptData.roomKorpus}` : ""}
            </span>
          </div>
          <div className="receipt-row">
            <span>To'lov turi:</span>
            <span>{receiptData?.paymentType || "-"}</span>
          </div>
          <div className="receipt-row receipt-row-strong">
            <span>To'langan:</span>
            <span>
              {Number(receiptData?.amount || 0).toLocaleString()} so'm
            </span>
          </div>
          <div className="receipt-row">
            <span>Qolgan qarz:</span>
            <span>
              {Number(receiptData?.remainingDebt || 0).toLocaleString()} so'm
            </span>
          </div>
          <div className="receipt-row">
            <span>Sana:</span>
            <span>{formatDateTime(receiptData?.createdAt)}</span>
          </div>
          {/* {receiptData?.note ? (
            <div className="receipt-note">Izoh: {receiptData.note}</div>
          ) : null} */}
          <div className="receipt-line" />
          <div className="receipt-row">
            <span>Kassir:</span>
            <span>{receiptData?.cashier || "-"}</span>
          </div>
          <div className="receipt-footer">
            {hotelSettings?.receiptThankYouText ||
              "Tashrifingiz uchun rahmat! Yana sizni kutib qolamiz."}
          </div>
        </div>
      </div>

      {/* A4 hotel receipt uchun yashirin print blok */}
      <div style={{ position: "absolute", left: "-99999px", top: 0 }}>
        <div ref={hotelReceiptRef} className="hotel-receipt-a4">
          <div className="hotel-receipt-head">
            {hotelSettings?.logo ? (
              <img
                src={hotelSettings.logo}
                alt="Hotel logo"
                className="hotel-receipt-logo"
              />
            ) : null}
            <h1>{hotelName}</h1>
            <p>Namangan sh. Amir Temur ko'chasi</p>
            <p>Tel: +998 99 999 99 99</p>
            <h2>Mehmon Hisoboti</h2>
          </div>

          <div className="hotel-receipt-grid">
            <div>
              <b>Mehmon:</b> {hotelReceiptData?.firstname || "-"}{" "}
              {hotelReceiptData?.lastname || ""}
            </div>
            <div>
              <b>Xona:</b> {formatRoomLabel(hotelReceiptData?.room)}
            </div>
            <div>
              <b>Passport:</b> {hotelReceiptData?.passport || "-"}
            </div>

            <div>
              <b>Kelgan sana:</b> {formatDateTime(hotelReceiptData?.checkInAt)}
            </div>
            <div>
              <b>Telefon:</b> {hotelReceiptData?.phone || "-"}
            </div>
            <div>
              <b>Chiqqan sana:</b>{" "}
              {formatDateTime(hotelReceiptData?.checkOutAt)}
            </div>

            <div>
              <b>Tugulgan sana:</b> {/* {hotelReceiptData?.birthDate || "-"} */}
              {dayjs(hotelReceiptData?.birthDate).format("DD.MM.YYYY")}
            </div>
          </div>

          <table className="hotel-receipt-table">
            <thead>
              <tr>
                <th>Kunlik narx</th>
                <th>Kunlar (hisob)</th>
                <th>Jami</th>
                <th>To'langan</th>
                <th>Qarz</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatMoney(hotelReceiptData?.dailyRate)}</td>
                <td>
                  {hotelReceiptData?.billableDays ||
                    hotelReceiptData?.stayDays ||
                    1}{" "}
                  / {hotelReceiptData?.stayDays || 1}
                </td>
                <td>{formatMoney(hotelReceiptData?.totalAmount)}</td>
                <td>{formatMoney(hotelReceiptData?.totalPaid)}</td>
                <td>{formatMoney(hotelReceiptData?.debtAmount)}</td>
              </tr>
            </tbody>
          </table>

          <div className="hotel-receipt-payments">
            <h3>Xizmatlar</h3>
            <table className="hotel-receipt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nomi</th>
                  <th>Soni</th>
                  <th>Narx</th>
                  <th>Jami</th>
                </tr>
              </thead>
              <tbody>
                {(hotelReceiptData?.services || []).length ? (
                  (hotelReceiptData?.services || []).map((service, index) => (
                    <tr key={`${service.usedAt}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{service.name}</td>
                      <td>{service.quantity}</td>
                      <td>{formatMoney(service.price)}</td>
                      <td>{formatMoney(service.totalAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>Xizmat ishlatilmagan</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="hotel-receipt-payments">
            <h3>To'lovlar tarixi</h3>
            <table className="hotel-receipt-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sana</th>
                  <th>Turi</th>
                  <th>Summa</th>
                </tr>
              </thead>
              <tbody>
                {(hotelReceiptData?.payments || []).length ? (
                  (hotelReceiptData?.payments || []).map((payment, index) => (
                    <tr key={`${payment.createdAt}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{formatDateTime(payment.createdAt)}</td>
                      <td>{payment.type || "-"}</td>
                      <td>{formatMoney(payment.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>To'lov topilmadi</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="hotel-receipt-footer">
            <b>Chop etilgan:</b> {formatDateTime(hotelReceiptData?.printedAt)}
          </div>
          <div className="hotel-receipt-thankyou">
            {hotelSettings?.receiptThankYouText ||
              "Tashrifingiz uchun rahmat! Yana sizni kutib qolamiz."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(GuestsPage);
