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
} from "react-icons/fi";
import {
  useAddGuestServiceMutation,
  useAddGuestPaymentMutation,
  useCheckoutGuestMutation,
  useDecideVipRequestMutation,
  useDeleteGuestMutation,
  useGetGuestsQuery,
  useLazyGetGuestsQuery,
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
import {
  acquireSocketConnection,
  releaseSocketConnection,
} from "../config/socketConfig";
import PageLoader from "../components/PageLoader";

const { RangePicker } = DatePicker;
const GUESTS_PAGE_SIZE = 20;

const paymentTypeOptions = [
  { label: "Naqd", value: "naqd" },
  { label: "Click", value: "click" },
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

const formatActionBy = (actionBy) => {
  const firstname = String(actionBy?.firstname || "").trim();
  const lastname = String(actionBy?.lastname || "").trim();
  const fullName = `${firstname} ${lastname}`.trim();
  if (fullName) return fullName;
  return actionBy?.login || "-";
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
                {request.guest?.room?.roomNumber || "-"}
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
  const hotelSettings = settingsData?.innerData || {};
  const hotelName = hotelSettings?.hotelName || "Mehmonxona nomi";
  const canDeleteGuest = String(user?.role || "").toLowerCase() === "manager";
  const [paymentForm] = Form.useForm();
  const [serviceForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [paymentGuest, setPaymentGuest] = useState(null);
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

  const canManageVip = String(user?.role || "").toLowerCase() === "admin";
  const shouldLoadVipRequests = canManageVip && tab === "active";
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
  const [addGuestService, { isLoading: savingService }] =
    useAddGuestServiceMutation();
  const [updateGuest, { isLoading: updating }] = useUpdateGuestMutation();
  const [checkoutGuest, { isLoading: checkingOut }] =
    useCheckoutGuestMutation();
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
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyGuest, setHistoryGuest] = useState(null);
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
    const debtAmount = Number(guest?.debtAmount || 0);
    if (!guest || debtAmount <= 0) return;
    setPaymentGuest(guest);
    setPaymentGuestId(guest._id);
    paymentForm.setFieldsValue({
      amount: debtAmount,
      type: "naqd",
      note: "",
    });
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
    editForm.setFieldsValue({
      firstname: guest.firstname || "",
      lastname: guest.lastname || "",
      passport: guest.passport || "",
      phone: guest.phone || "",
      guestType: guest.guestType || "uzb",
      dailyRate: Number(guest.dailyRate || 0),
      stayDays: Number(guest.stayDays || 1),
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
    editForm.resetFields();
  };

  const openHistoryModal = (guest) => {
    setHistoryGuest(guest);
    setIsHistoryModalOpen(true);
  };

  const closeHistoryModal = () => {
    setHistoryGuest(null);
    setIsHistoryModalOpen(false);
  };

  const onPaymentSubmit = async (values) => {
    try {
      const debtAmount = Number(paymentGuest?.debtAmount || 0);
      if (debtAmount <= 0) {
        toast.error("Qarzdorlik mavjud emas");
        return;
      }
      const paymentAmount = Number(values.amount || 0);
      if (paymentAmount > debtAmount) {
        toast.error("To'lov qarzdan oshmasin");
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

  const onCheckout = async (id) => {
    try {
      const result = await checkoutGuest(id).unwrap();
      toast.success(result?.message || "Checkout qilindi");
    } catch (err) {
      toast.error(err?.data?.message || "Checkoutda xatolik");
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
        guestType: values.guestType || "uzb",
        dailyRate: Number(values.dailyRate || 0),
        stayDays: Number(values.stayDays || 1),
        note: String(values.note || "").trim(),
        isBlacklisted: Boolean(values.isBlacklisted),
      };
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
        Xona: guest.room?.roomNumber || "",
        Qavat: guest.room?.floor ? `${guest.room.floor}-qavat` : "",
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
  const paymentDebtMax = Math.max(Number(paymentGuest?.debtAmount || 0), 0);
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
            <div className="table-wrap guests-table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>F.I.SH</th>
                    <th>Passport</th>
                    <th>Xona</th>
                    <th>Kunlar</th>
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
                      <td data-label="F.I.SH">
                        {guest.firstname} {guest.lastname}
                      </td>
                      <td data-label="Passport">{guest.passport}</td>
                      <td data-label="Xona">
                        <b>{guest.room?.roomNumber || "-"}</b>
                        <br />
                        <span className="room-floor">
                          {guest.room?.floor
                            ? `${guest.room.floor}-qavat`
                            : "-"}
                        </span>
                      </td>
                      <td data-label="Kunlar">
                        {guest.billableDays || guest.stayDays || 1} /{" "}
                        {guest.stayDays || 1}
                      </td>
                      <td data-label="Kunlik">
                        {Number(guest.dailyRate || 0).toLocaleString()}
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
                                guest.vip || Number(guest.debtAmount || 0) <= 0
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
                                  Number(guest.debtAmount || 0) <= 0
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
                                className="icon-btn danger"
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
                        colSpan={tab === "history" ? 15 : 13}
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
              label="Summasi"
              rules={[
                { required: true, message: "Summa majburiy" },
                () => ({
                  validator() {
                    const debtAmount = Number(paymentGuest?.debtAmount || 0);
                    const value = Number(
                      paymentForm.getFieldValue("amount") || 0,
                    );
                    if (debtAmount > 0 && value > debtAmount) {
                      return Promise.reject(
                        new Error("To'lov miqdori qarzdan oshmasin"),
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
          width={560}
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
              />
            </Form.Item>
            <Form.Item
              name="stayDays"
              label="Qolish kuni"
              rules={[{ required: true, message: "Kun majburiy" }]}
            >
              <InputNumber
                min={1}
                precision={0}
                style={{ width: "100%" }}
                parser={(value) => String(value || "").replace(/[^\d]/g, "")}
                onKeyDown={blockNonIntegerKeys}
              />
            </Form.Item>
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
            <Form.Item name="vip" label=" " valuePropName="checked">
              <Checkbox>VIP so'rov yuborish</Checkbox>
            </Form.Item>
            <Form.Item
              name="isBlacklisted"
              label=" "
              valuePropName="checked"
              className="guest-edit-note-full"
            >
              <Checkbox>Qora ro'yxatga olish</Checkbox>
            </Form.Item>
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
          title={`To'lov tarixi: ${historyGuest?.firstname || ""} ${historyGuest?.lastname || ""}`}
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
                  </tr>
                ))}
                {(historyGuest?.payments || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty">
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
            <span>{receiptData?.roomNumber || "-"}</span>
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
              <b>Xona:</b> {hotelReceiptData?.room?.roomNumber || "-"} /{" "}
              {hotelReceiptData?.room?.floor
                ? `${hotelReceiptData.room.floor}-qavat`
                : "-"}
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
