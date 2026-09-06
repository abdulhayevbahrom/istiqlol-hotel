import { useMemo, useRef, useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Table,
  Tabs,
} from "antd";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import {
  FiEdit2,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
} from "react-icons/fi";
import {
  useCreateReceiptMutation,
  useDeleteReceiptMutation,
  useGetGuestsQuery,
  useGetReceiptsQuery,
  useGetSettingsQuery,
  useUpdateReceiptMutation,
} from "../store/employeeApi";
import {
  blockNonIntegerKeys,
  preventInvalidAmountPaste,
} from "../utils/numberFormat";

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

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString("uz-UZ")} so'm`;

const formatInputNumber = (value) =>
  String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const parseInputNumber = (value) => String(value || "").replace(/[^\d]/g, "");

const formatRoomLabel = (room) => {
  if (!room) return "-";
  const roomNumber = room.roomNumber || "-";
  const korpus = room.korpus ? `${room.korpus} korpus` : "";
  const floor = room.floor ? `${room.floor}-qavat` : "";
  return [roomNumber, korpus, floor].filter(Boolean).join(" / ");
};

const hotelNameOptions = [
  { label: "Istiqlol", value: "Istiqlol" },
  { label: "Das", value: "Das" },
  { label: "Versal", value: "Versal" },
  { label: "Golder Art", value: "Golder Art" },
];

const uzUnits = [
  "",
  "bir",
  "ikki",
  "uch",
  "to'rt",
  "besh",
  "olti",
  "yetti",
  "sakkiz",
  "to'qqiz",
];
const uzTens = [
  "",
  "o'n",
  "yigirma",
  "o'ttiz",
  "qirq",
  "ellik",
  "oltmish",
  "yetmish",
  "sakson",
  "to'qson",
];

const underThousandToWords = (number) => {
  const parts = [];
  const hundreds = Math.floor(number / 100);
  const tens = Math.floor((number % 100) / 10);
  const units = number % 10;
  if (hundreds) parts.push(`${uzUnits[hundreds]} yuz`);
  if (tens) parts.push(uzTens[tens]);
  if (units) parts.push(uzUnits[units]);
  return parts.join(" ");
};

const numberToUzbekWords = (value) => {
  const number = Math.floor(Math.max(Number(value || 0), 0));
  if (!number) return "nol so'm";

  const scales = ["", "ming", "million", "milliard"];
  const parts = [];
  let remaining = number;
  let scaleIndex = 0;

  while (remaining > 0) {
    const chunk = remaining % 1000;
    if (chunk) {
      const words = underThousandToWords(chunk);
      parts.unshift([words, scales[scaleIndex]].filter(Boolean).join(" "));
    }
    remaining = Math.floor(remaining / 1000);
    scaleIndex += 1;
  }

  return `${parts.join(" ")} so'm`;
};

const buildDefaultServices = (guest) => {
  const lodgingTotal =
    Number(guest?.totalAmount || 0) -
    (guest?.services || []).reduce(
      (sum, service) => sum + Number(service?.totalAmount || 0),
      0,
    );
  const services = [
    {
      name: "Mehmonxona xizmati",
      quantity: Number(guest?.billableDays || guest?.stayDays || 1),
      price: Number(guest?.dailyRate || guest?.currentDailyRate || 0),
      total: Math.max(lodgingTotal, 0),
    },
    ...(guest?.services || []).map((service) => ({
      name: service.name || "Xizmat",
      quantity: Number(service.quantity || 1),
      price: Number(service.price || 0),
      total: Number(service.totalAmount || 0),
    })),
  ];

  return services.length
    ? services
    : [{ name: "Mehmonxona xizmati", quantity: 1, price: 0, total: 0 }];
};

function ReceiptsPage() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const receiptRef = useRef(null);
  const user = useSelector((state) => state.auth.user);
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const liveReceiptValues = Form.useWatch([], form);

  const { data: settingsData } = useGetSettingsQuery();
  const { data: activeGuestsData, isFetching: activeLoading } =
    useGetGuestsQuery({ tab: "active", limit: 100 });
  const { data: historyGuestsData, isFetching: historyLoading } =
    useGetGuestsQuery({ tab: "history", limit: 100 });
  const [createReceipt, { isLoading: isSavingReceipt }] =
    useCreateReceiptMutation();
  const [updateReceipt, { isLoading: isUpdatingReceipt }] =
    useUpdateReceiptMutation();
  const [deleteReceipt] = useDeleteReceiptMutation();
  const { data: receiptsData, isFetching: receiptsLoading } =
    useGetReceiptsQuery({ query: historyQuery, page: historyPage, limit: 10 });

  const hotelSettings = settingsData?.innerData || {};
  const cashier =
    `${user?.firstname || ""} ${user?.lastname || ""}`.trim() ||
    user?.login ||
    "-";

  const guests = useMemo(() => {
    const map = new Map();
    [
      ...(activeGuestsData?.innerData?.items || []),
      ...(historyGuestsData?.innerData?.items || []),
    ].forEach((guest) => map.set(guest._id, guest));
    return Array.from(map.values());
  }, [activeGuestsData, historyGuestsData]);

  const guestOptions = guests.map((guest) => ({
    value: guest._id,
    label:
      `${guest.firstname || ""} ${guest.lastname || ""}`.trim() ||
      guest.passport ||
      guest._id,
  }));

  const applyGuest = (guestId) => {
    const guest = guests.find((item) => item._id === guestId);
    setSelectedGuestId(guestId);
    if (!guest) return;

    const services = buildDefaultServices(guest);
    const total = services.reduce(
      (sum, service) => sum + Number(service.total || 0),
      0,
    );
    form.setFieldsValue({
      hotelName: form.getFieldValue("hotelName") || "Istiqlol",
      receiptNumber: `KV-${dayjs().format("YYYYMMDD-HHmm")}`,
      receiptDate: dayjs(),
      guestName: `${guest.firstname || ""} ${guest.lastname || ""}`.trim(),
      room: formatRoomLabel(guest.room),
      checkInAt: guest.checkInAt ? dayjs(guest.checkInAt) : null,
      checkOutAt: guest.checkOutAt ? dayjs(guest.checkOutAt) : null,
      services,
      totalAmount: total,
      totalWords: numberToUzbekWords(total),
      administrator: cashier,
    });
  };

  const refreshTotalWords = () => {
    const total = Number(form.getFieldValue("totalAmount") || 0);
    form.setFieldValue("totalWords", numberToUzbekWords(total));
  };

  const printReceipt = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Kvitansiya-${receipt?.receiptNumber || dayjs().format("YYYY-MM-DD")}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  const onValuesChange = (changed, values) => {
    const nextServices = [...(values.services || [])];
    let shouldUpdateServices = false;

    if (changed.services) {
      changed.services.forEach((changedService, index) => {
        if (!changedService) return;
        if (!("quantity" in changedService) && !("price" in changedService)) {
          return;
        }
        const service = nextServices[index] || {};
        const quantity = Number(service.quantity || 0);
        const price = Number(service.price || 0);
        nextServices[index] = {
          ...service,
          total: quantity * price,
        };
        shouldUpdateServices = true;
      });
    }

    const services = shouldUpdateServices
      ? nextServices
      : values.services || [];
    const total = services.reduce((sum, service) => {
      const quantity = Number(service?.quantity || 0);
      const price = Number(service?.price || 0);
      const rowTotal = Number(service?.total || quantity * price || 0);
      return sum + rowTotal;
    }, 0);
    form.setFieldsValue({
      ...(shouldUpdateServices ? { services: nextServices } : {}),
      totalAmount: total,
      totalWords: numberToUzbekWords(total),
    });
  };

  const normalizeReceiptPayload = (values) => ({
    ...values,
    receiptDate: values.receiptDate?.toISOString?.() || values.receiptDate,
    checkInAt: values.checkInAt?.toISOString?.() || values.checkInAt || null,
    checkOutAt: values.checkOutAt?.toISOString?.() || values.checkOutAt || null,
    printedAt: new Date().toISOString(),
  });

  const toPrintableReceipt = (receiptValue) => ({
    ...receiptValue,
    receiptDate: receiptValue.receiptDate ? new Date(receiptValue.receiptDate) : null,
    checkInAt: receiptValue.checkInAt ? new Date(receiptValue.checkInAt) : null,
    checkOutAt: receiptValue.checkOutAt ? new Date(receiptValue.checkOutAt) : null,
    printedAt: receiptValue.printedAt ? new Date(receiptValue.printedAt) : new Date(),
  });

  const onFinish = async (values) => {
    const nextReceipt = {
      ...values,
      receiptDate: values.receiptDate?.toDate?.() || new Date(),
      checkInAt: values.checkInAt?.toDate?.() || null,
      checkOutAt: values.checkOutAt?.toDate?.() || null,
      printedAt: new Date(),
    };
    try {
      const saved = await createReceipt(normalizeReceiptPayload(values)).unwrap();
      const savedReceipt = saved?.innerData || saved;
      setReceipt(toPrintableReceipt(savedReceipt || nextReceipt));
      toast.success("Kvitansiya bazaga saqlandi");
      setTimeout(() => printReceipt(), 0);
    } catch (error) {
      toast.error(
        error?.data?.message ||
          error?.data?.innerData ||
          "Kvitansiyani saqlashda xatolik",
      );
    }
  };

  const printReceiptCopy = (savedReceipt) => {
    setReceipt(toPrintableReceipt(savedReceipt));
    setTimeout(() => printReceipt(), 0);
  };

  const openEditReceipt = (record) => {
    setEditingReceipt(record);
    editForm.setFieldsValue({
      ...record,
      receiptDate: record.receiptDate ? dayjs(record.receiptDate) : null,
      checkInAt: record.checkInAt ? dayjs(record.checkInAt) : null,
      checkOutAt: record.checkOutAt ? dayjs(record.checkOutAt) : null,
      services: record.services?.length
        ? record.services
        : [{ name: "Mehmonxona xizmati", quantity: 1, price: 0, total: 0 }],
    });
  };

  const onEditValuesChange = (changed, values) => {
    const nextServices = [...(values.services || [])];
    let shouldUpdateServices = false;

    if (changed.services) {
      changed.services.forEach((changedService, index) => {
        if (!changedService) return;
        if (!("quantity" in changedService) && !("price" in changedService)) {
          return;
        }
        const service = nextServices[index] || {};
        const quantity = Number(service.quantity || 0);
        const price = Number(service.price || 0);
        nextServices[index] = { ...service, total: quantity * price };
        shouldUpdateServices = true;
      });
    }

    const services = shouldUpdateServices
      ? nextServices
      : values.services || [];
    const total = services.reduce(
      (sum, service) =>
        sum +
        Number(
          service?.total ||
            Number(service?.quantity || 0) * Number(service?.price || 0) ||
            0,
        ),
      0,
    );
    editForm.setFieldsValue({
      ...(shouldUpdateServices ? { services: nextServices } : {}),
      totalAmount: total,
      totalWords: numberToUzbekWords(total),
    });
  };

  const onEditFinish = async (values) => {
    if (!editingReceipt?._id) return;
    try {
      await updateReceipt({
        id: editingReceipt._id,
        ...normalizeReceiptPayload(values),
      }).unwrap();
      toast.success("Kvitansiya yangilandi");
      setEditingReceipt(null);
      editForm.resetFields();
    } catch (error) {
      toast.error(
        error?.data?.message ||
          error?.data?.innerData ||
          "Kvitansiyani yangilashda xatolik",
      );
    }
  };

  const onDeleteReceipt = async (id) => {
    try {
      await deleteReceipt(id).unwrap();
      toast.success("Kvitansiya o'chirildi");
    } catch (error) {
      toast.error(
        error?.data?.message ||
          error?.data?.innerData ||
          "Kvitansiyani o'chirishda xatolik",
      );
    }
  };

  return (
    <div className="page receipts-root-page">
      <Tabs
        className="receipt-tabs"
        items={[
          {
            key: "new",
            label: "Yangi kvitansiya",
            children: (
              <div className="receipts-page">
                <div className="page-card receipt-form-card">
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onValuesChange={onValuesChange}
          onFinish={onFinish}
          initialValues={{
            hotelName: "Istiqlol",
            receiptNumber: `KV-${dayjs().format("YYYYMMDD-HHmm")}`,
            receiptDate: dayjs(),
            services: [
              { name: "Mehmonxona xizmati", quantity: 1, price: 0, total: 0 },
            ],
            totalAmount: 0,
            totalWords: "nol so'm",
            administrator: cashier,
          }}
        >
          <Form.Item
            name="hotelName"
            label="Hotel nomi"
            className="receipt-hotel-select"
            rules={[{ required: true, message: "Hotel nomini tanlang" }]}
          >
            <Select options={hotelNameOptions} />
          </Form.Item>

          <div className="receipt-form-grid">
            <Form.Item label="Mijozni tanlash">
              <Select
                showSearch
                allowClear
                value={selectedGuestId || undefined}
                placeholder="Mijoz ismi, passporti yoki xonasi bo'yicha tanlang"
                loading={activeLoading || historyLoading}
                optionFilterProp="label"
                options={guestOptions}
                onChange={applyGuest}
              />
            </Form.Item>
            <Form.Item
              name="receiptNumber"
              label="Kvitansiya raqami"
              rules={[
                { required: true, message: "Kvitansiya raqami majburiy" },
              ]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="receiptDate"
              label="Kvitansiya sanasi"
              rules={[
                { required: true, message: "Kvitansiya sanasi majburiy" },
              ]}
            >
              <DatePicker
                showTime
                format="DD.MM.YYYY HH:mm"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="guestName"
              label="Ismi va familiyasi"
              rules={[{ required: true, message: "Mehmon FIO majburiy" }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="room" label="Yashagan xonasi">
              <Input />
            </Form.Item>
            <Form.Item name="checkInAt" label="Kelgan vaqti">
              <DatePicker
                showTime
                format="DD.MM.YYYY HH:mm"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="checkOutAt" label="Ketgan vaqti">
              <DatePicker
                showTime
                format="DD.MM.YYYY HH:mm"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item name="administrator" label="Administrator FIO">
              <Input />
            </Form.Item>
          </div>

          <Form.List name="services">
            {(fields, { add, remove }) => (
              <div className="receipt-services-editor">
                <div className="row-actions receipt-service-actions">
                  <b>Xizmatlar</b>
                  <Button
                    icon={<FiPlus />}
                    onClick={() =>
                      add({ name: "", quantity: 1, price: 0, total: 0 })
                    }
                  >
                    Xizmat qo'shish
                  </Button>
                </div>
                <div className="receipt-service-header">
                  <span>Xizmat nomi</span>
                  <span>Miqdori</span>
                  <span>Narxi</span>
                  <span>Summasi</span>
                  <span>Amal</span>
                </div>
                {fields.map((field) => (
                  <div className="receipt-service-row" key={field.key}>
                    <Form.Item
                      name={[field.name, "name"]}
                      rules={[{ required: true, message: "Nomi" }]}
                    >
                      <Input placeholder="Xizmat nomi" />
                    </Form.Item>
                    <Form.Item name={[field.name, "quantity"]}>
                      <InputNumber
                        min={0}
                        placeholder="Miqdori"
                        onKeyDown={blockNonIntegerKeys}
                        onPaste={preventInvalidAmountPaste}
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, "price"]}>
                      <InputNumber
                        min={0}
                        placeholder="Narxi"
                        formatter={formatInputNumber}
                        parser={parseInputNumber}
                        onKeyDown={blockNonIntegerKeys}
                        onPaste={preventInvalidAmountPaste}
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, "total"]}>
                      <InputNumber
                        min={0}
                        placeholder="Summasi"
                        formatter={formatInputNumber}
                        parser={parseInputNumber}
                        onKeyDown={blockNonIntegerKeys}
                        onPaste={preventInvalidAmountPaste}
                      />
                    </Form.Item>
                    <Button
                      danger
                      icon={<FiTrash2 />}
                      className="receipt-remove-btn"
                      aria-label="Xizmatni o'chirish"
                      onClick={() => remove(field.name)}
                    >
                      O'chirish
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Form.List>

          <div className="receipt-total-grid">
            <Form.Item name="totalAmount" label="To'lov uchun jami">
              <InputNumber
                min={0}
                addonAfter="so'm"
                style={{ width: "100%" }}
                formatter={formatInputNumber}
                parser={parseInputNumber}
                onChange={refreshTotalWords}
                onKeyDown={blockNonIntegerKeys}
                onPaste={preventInvalidAmountPaste}
              />
            </Form.Item>
            <Form.Item name="totalWords" label="To'lov so'z bilan">
              <Input suffix={<FiRefreshCw onClick={refreshTotalWords} />} />
            </Form.Item>
          </div>
        </Form>
                </div>

                <div className="page-card receipt-preview-card">
        <div className="receipt-preview-head">
          <h3>Ko'rinish</h3>
          <Button
            icon={<FiPrinter />}
            className="hotel-primary-btn"
            loading={isSavingReceipt}
            onClick={() => form.submit()}
          >
            Chop etish
          </Button>
        </div>
        <div className="receipt-preview-shell">
          <div className="receipt-preview-paper">
            <ReceiptDocument
              refEl={receiptRef}
              receipt={{
                ...form.getFieldsValue(true),
                ...(liveReceiptValues || {}),
                printedAt: receipt?.printedAt || new Date(),
              }}
              hotelSettings={hotelSettings}
            />
          </div>
        </div>
                </div>
              </div>
            ),
          },
          {
            key: "history",
            label: "Tarix",
            children: (
              <div className="page-card receipt-history-card">
                <div className="section-head">
                 
                  <Input
                    allowClear
                    className="receipt-history-search"
                    prefix={<FiSearch />}
                    placeholder="Raqam, mijoz, xona yoki hotel bo'yicha qidirish"
                    value={historyQuery}
                    onChange={(event) => {
                      setHistoryQuery(event.target.value);
                      setHistoryPage(1);
                    }}
                  />
                </div>
                <Table
                  rowKey="_id"
                  className="receipt-history-table"
                  size="small"
                  loading={receiptsLoading}
                  dataSource={receiptsData?.innerData?.items || []}
                  pagination={{
                    current: receiptsData?.innerData?.page || historyPage,
                    pageSize: receiptsData?.innerData?.limit || 10,
                    total: receiptsData?.innerData?.total || 0,
                    onChange: setHistoryPage,
                    showSizeChanger: false,
                  }}
                  columns={[
                    {
                      title: "Raqami",
                      dataIndex: "receiptNumber",
                    },
                    {
                      title: "Hotel",
                      dataIndex: "hotelName",
                    },
                    {
                      title: "Mijoz",
                      dataIndex: "guestName",
                    },
                    {
                      title: "Xona",
                      dataIndex: "room",
                      render: (value) => value || "-",
                    },
                    {
                      title: "Jami",
                      dataIndex: "totalAmount",
                      render: formatMoney,
                    },
                    {
                      title: "Sana",
                      dataIndex: "receiptDate",
                      render: formatDateTime,
                    },
                    {
                      title: "Amal",
                      render: (_, record) => (
                        <div className="table-action-wrap">
                          <Button
                            icon={<FiPrinter />}
                            aria-label="Nusxa chop etish"
                            onClick={() => printReceiptCopy(record)}
                          />
                          <Button
                            icon={<FiEdit2 />}
                            aria-label="Tahrirlash"
                            onClick={() => openEditReceipt(record)}
                          />
                          <Popconfirm
                            title="Kvitansiya o'chirilsinmi?"
                            okText="Ha"
                            cancelText="Yo'q"
                            onConfirm={() => onDeleteReceipt(record._id)}
                          >
                            <Button
                              danger
                              icon={<FiTrash2 />}
                              aria-label="O'chirish"
                            />
                          </Popconfirm>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
      <Modal
        open={Boolean(editingReceipt)}
        title="Kvitansiyani tahrirlash"
        width={900}
        destroyOnHidden
        onCancel={() => {
          setEditingReceipt(null);
          editForm.resetFields();
        }}
        footer={null}
      >
        <ReceiptEditForm
          form={editForm}
          loading={isUpdatingReceipt}
          onValuesChange={onEditValuesChange}
          onFinish={onEditFinish}
        />
      </Modal>
    </div>
  );
}

function ReceiptEditForm({ form, loading, onValuesChange, onFinish }) {
  const refreshWords = () => {
    const total = Number(form.getFieldValue("totalAmount") || 0);
    form.setFieldValue("totalWords", numberToUzbekWords(total));
  };

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      onValuesChange={onValuesChange}
      onFinish={onFinish}
    >
      <div className="receipt-form-grid">
        <Form.Item name="hotelName" label="Hotel nomi" rules={[{ required: true }]}>
          <Select options={hotelNameOptions} />
        </Form.Item>
        <Form.Item name="receiptNumber" label="Kvitansiya raqami" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="receiptDate" label="Kvitansiya sanasi" rules={[{ required: true }]}>
          <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="guestName" label="Ismi va familiyasi" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="room" label="Yashagan xonasi">
          <Input />
        </Form.Item>
        <Form.Item name="checkInAt" label="Kelgan vaqti">
          <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="checkOutAt" label="Ketgan vaqti">
          <DatePicker showTime format="DD.MM.YYYY HH:mm" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="administrator" label="Administrator FIO">
          <Input />
        </Form.Item>
      </div>

      <Form.List name="services">
        {(fields, { add, remove }) => (
          <div className="receipt-services-editor">
            <div className="row-actions receipt-service-actions">
              <b>Xizmatlar</b>
              <Button icon={<FiPlus />} onClick={() => add({ name: "", quantity: 1, price: 0, total: 0 })}>
                Xizmat qo'shish
              </Button>
            </div>
            <div className="receipt-service-header">
              <span>Xizmat nomi</span>
              <span>Miqdori</span>
              <span>Narxi</span>
              <span>Summasi</span>
              <span>Amal</span>
            </div>
            {fields.map((field) => (
              <div className="receipt-service-row" key={field.key}>
                <Form.Item name={[field.name, "name"]} rules={[{ required: true }]}>
                  <Input placeholder="Xizmat nomi" />
                </Form.Item>
                <Form.Item name={[field.name, "quantity"]}>
                  <InputNumber min={0} onKeyDown={blockNonIntegerKeys} onPaste={preventInvalidAmountPaste} />
                </Form.Item>
                <Form.Item name={[field.name, "price"]}>
                  <InputNumber min={0} formatter={formatInputNumber} parser={parseInputNumber} onKeyDown={blockNonIntegerKeys} onPaste={preventInvalidAmountPaste} />
                </Form.Item>
                <Form.Item name={[field.name, "total"]}>
                  <InputNumber min={0} formatter={formatInputNumber} parser={parseInputNumber} onKeyDown={blockNonIntegerKeys} onPaste={preventInvalidAmountPaste} />
                </Form.Item>
                <Button danger icon={<FiTrash2 />} className="receipt-remove-btn" onClick={() => remove(field.name)}>
                  O'chirish
                </Button>
              </div>
            ))}
          </div>
        )}
      </Form.List>

      <div className="receipt-total-grid">
        <Form.Item name="totalAmount" label="To'lov uchun jami">
          <InputNumber min={0} addonAfter="so'm" style={{ width: "100%" }} formatter={formatInputNumber} parser={parseInputNumber} onChange={refreshWords} onKeyDown={blockNonIntegerKeys} onPaste={preventInvalidAmountPaste} />
        </Form.Item>
        <Form.Item name="totalWords" label="To'lov so'z bilan">
          <Input suffix={<FiRefreshCw onClick={refreshWords} />} />
        </Form.Item>
      </div>

      <div className="row-actions">
        <Button htmlType="submit" className="hotel-primary-btn" loading={loading}>
          Saqlash
        </Button>
      </div>
    </Form>
  );
}

function ReceiptDocument({ refEl, receipt, hotelSettings }) {
  const services = receipt?.services || [];
  const hotelName = receipt?.hotelName || "Istiqlol";
  return (
    <div ref={refEl} className="hotel-receipt-a4 receipt-das-a4">
      <div className="hotel-receipt-head">
        {hotelSettings?.logo ? (
          <img
            src={hotelSettings.logo}
            alt="Hotel logo"
            className="hotel-receipt-logo"
          />
        ) : null}
        <h1>{hotelName}</h1>
        <p>Namangan Davlatobod I.Karimov ko'cha 20-uy</p>
        <p>Tel: +998 78 223 00 15</p>
        <h2>Kvitansiya</h2>
      </div>

      <div className="hotel-receipt-grid">
        <div>
          <b>Kvitansiya raqami:</b> {receipt?.receiptNumber || "-"}
        </div>
        <div>
          <b>Kvitansiya sanasi:</b> {formatDateTime(receipt?.receiptDate)}
        </div>
        <div>
          <b>Ismi va familiyasi:</b> {receipt?.guestName || "-"}
        </div>
        <div>
          <b>Yashagan xonasi:</b> {receipt?.room || "-"}
        </div>
        <div>
          <b>Kelgan vaqti:</b> {formatDateTime(receipt?.checkInAt)}
        </div>
        <div>
          <b>Ketgan vaqti:</b> {formatDateTime(receipt?.checkOutAt)}
        </div>
      </div>

      <Table
        className="receipt-print-table"
        size="small"
        dataSource={services.map((service, index) => ({
          ...service,
          key: index,
        }))}
        pagination={false}
        bordered
        columns={[
          { title: "Xizmat nomi", dataIndex: "name" },
          { title: "Miqdori", dataIndex: "quantity", width: 110 },
          {
            title: "Narxi",
            dataIndex: "price",
            width: 150,
            render: formatMoney,
          },
          {
            title: "Summasi",
            dataIndex: "total",
            width: 160,
            render: formatMoney,
          },
        ]}
      />

      <div className="receipt-das-total">
        <div>
          <b>To'lov so'z bilan:</b> {receipt?.totalWords || "-"}
        </div>
        <div>
          <b>To'lov uchun jami:</b> {formatMoney(receipt?.totalAmount)}
        </div>
      </div>

      <div className="hotel-receipt-footer">
        <div>
          <b>Administrator FIO:</b> {receipt?.administrator || "-"}
        </div>
        <div>
          <b>Chop etilgan:</b>{" "}
          {formatDateTime(receipt?.printedAt || new Date())}
        </div>
      </div>
      <div className="hotel-receipt-thankyou">
        {hotelSettings?.receiptThankYouText ||
          "Ushbu narx ichiga barcha soliqlar va yig'imlar kiritilgan."}
      </div>
    </div>
  );
}

export default ReceiptsPage;
