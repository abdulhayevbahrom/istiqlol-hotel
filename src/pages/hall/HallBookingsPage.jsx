import {
  Button,
  DatePicker,
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
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiEdit2,
  FiPlayCircle,
  FiTrash2,
  FiXCircle,
} from "react-icons/fi";
import {
  useAddHallBookingPaymentMutation,
  useCancelHallBookingMutation,
  useCreateHallBookingMutation,
  useDeleteHallBookingMutation,
  useGetHallBookingsQuery,
  useUpdateHallBookingMutation,
} from "../../store/employeeApi";
import {
  blockNonIntegerKeys,
  preventInvalidAmountPaste,
} from "../../utils/numberFormat";
import PageLoader from "../../components/PageLoader";
import "./hall.css";

const paymentTypeOptions = [
  { label: "Naqd", value: "naqd" },
  { label: "Click", value: "click" },
  { label: "Bank", value: "bank" },
  { label: "Karta", value: "karta" },
];

const normalizePhone = (value) => {
  const raw = String(value || "");
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  return `${hasPlus ? "+" : ""}${digits}`;
};

function HallBookingsPage() {
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState(null);

  const { data, isLoading } = useGetHallBookingsQuery(tab);
  const [createHallBooking, { isLoading: creating }] =
    useCreateHallBookingMutation();
  const [updateHallBooking, { isLoading: updating }] =
    useUpdateHallBookingMutation();
  const [addHallPayment, { isLoading: paying }] =
    useAddHallBookingPaymentMutation();
  const [cancelHallBooking, { isLoading: canceling }] =
    useCancelHallBookingMutation();
  const [deleteHallBooking, { isLoading: deleting }] =
    useDeleteHallBookingMutation();
  const items = useMemo(() => data?.innerData || [], [data]);
  const filteredItems = useMemo(() => {
    const q = String(search || "")
      .trim()
      .toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [
        item.hallName,
        item.eventName,
        item.customerFirstname,
        item.customerLastname,
        item.phone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);
  const pageSize = 20;
  const paged = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const hallOptions = useMemo(() => {
    const unique = [
      ...new Set(items.map((item) => item.hallName).filter(Boolean)),
    ];
    return unique.map((name) => ({ label: name, value: name }));
  }, [items]);

  const openCreateModal = () => {
    setEditing(null);
    form.setFieldsValue({
      hallName: undefined,
      customerFirstname: "",
      customerLastname: "",
      phone: "",
      eventName: "",
      dateRange: null,
      totalAmount: 0,
      paidAmount: 0,
      note: "",
    });
    setOpen(true);
  };

  const openEditModal = (item) => {
    setEditing(item);
    form.setFieldsValue({
      hallName: item.hallName,
      customerFirstname: item.customerFirstname || "",
      customerLastname: item.customerLastname || "",
      phone: item.phone || "",
      eventName: item.eventName || "",
      dateRange: [dayjs(item.startDate), dayjs(item.endDate)],
      totalAmount: Number(item.totalAmount || 0),
      paidAmount: Number(item.paidAmount || 0),
      note: item.note || "",
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const openPaymentModal = (item) => {
    setPaymentBooking(item);
    paymentForm.setFieldsValue({
      amount: Number(item.debtAmount || 0),
      type: "naqd",
      note: "",
    });
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentBooking(null);
    paymentForm.resetFields();
  };

  const selectedHallName = Form.useWatch("hallName", form);

  const disabledDate = (current) => {
    if (!selectedHallName || !current) return false;
    const hallName = String(selectedHallName || "");
    const currentTime = current.startOf("day").valueOf();
    return items.some((item) => {
      if (item.hallName !== hallName) return false;
      if (editing && item._id === editing._id) return false;
      const start = dayjs(item.startDate).startOf("day").valueOf();
      const end = dayjs(item.endDate).endOf("day").valueOf();
      return currentTime >= start && currentTime <= end;
    });
  };

  const onSubmit = async (values) => {
    try {
      const payload = {
        hallName: String(values.hallName || "").trim(),
        customerFirstname: String(values.customerFirstname || "").trim(),
        customerLastname: String(values.customerLastname || "").trim(),
        phone: String(values.phone || "").trim(),
        eventName: String(values.eventName || "").trim(),
        startDate: values.dateRange?.[0]?.format("YYYY-MM-DD"),
        endDate: values.dateRange?.[1]?.format("YYYY-MM-DD"),
        totalAmount: Number(values.totalAmount || 0),
        note: String(values.note || "").trim(),
      };
      if (!editing) payload.paidAmount = Number(values.paidAmount || 0);

      const result = editing
        ? await updateHallBooking({ id: editing._id, ...payload }).unwrap()
        : await createHallBooking(payload).unwrap();
      toast.success(result?.message || "Saqlandi");
      closeModal();
    } catch (err) {
      toast.error(err?.data?.message || "Xatolik");
    }
  };

  const onPaymentSubmit = async (values) => {
    try {
      const amount = Number(values.amount || 0);
      const debt = Number(paymentBooking?.debtAmount || 0);
      if (amount > debt) {
        toast.error("To'lov qarzdan oshmasin");
        return;
      }
      const result = await addHallPayment({
        id: paymentBooking._id,
        amount,
        type: values.type,
        note: String(values.note || "").trim(),
      }).unwrap();
      toast.success(result?.message || "To'lov qo'shildi");
      closePaymentModal();
    } catch (err) {
      toast.error(err?.data?.message || "Xatolik");
    }
  };

  const onCancelBooking = async (id) => {
    try {
      const result = await cancelHallBooking(id).unwrap();
      toast.success(result?.message || "Buyurtma bekor qilindi");
    } catch (err) {
      toast.error(err?.data?.message || "Xatolik");
    }
  };

  const onDeleteBooking = async (id) => {
    try {
      const result = await deleteHallBooking(id).unwrap();
      toast.success(result?.message || "Buyurtma o'chirildi");
    } catch (err) {
      toast.error(err?.data?.message || "Xatolik");
    }
  };

  const stateTag = (state) => {
    if (state === "upcoming") {
      return (
        <Tag className="hall-state-tag hall-state-upcoming">
          <FiClock size={13} /> Bo'ladi
        </Tag>
      );
    }
    if (state === "past") {
      return (
        <Tag className="hall-state-tag hall-state-past">
          <FiCheckCircle size={13} /> O'tib ketgan
        </Tag>
      );
    }
    if (state === "canceled") {
      return (
        <Tag className="hall-state-tag hall-state-canceled">
          <FiXCircle size={13} /> Bekor qilingan
        </Tag>
      );
    }
    return (
      <Tag className="hall-state-tag hall-state-ongoing">
        <FiPlayCircle size={13} /> Davom etmoqda
      </Tag>
    );
  };

  return (
    <div className="employee-page hall-page">
      <div className="page-card">
        <div className="table-toolbar">
          <h2>Zal ijarasi</h2>
          <div className="toolbar-actions">
            <Segmented
              value={tab}
              onChange={(value) => {
                setTab(value);
                setPage(1);
              }}
              className="hall-tab-segmented"
              options={[
                { label: "Barchasi", value: "all" },
                { label: "Qarzdorlar", value: "debtors" },
              ]}
            />
            <Input
              className="search-input"
              placeholder="Qidirish: zal, buyurtmachi, tadbir, telefon"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Button className="hotel-primary-btn" onClick={openCreateModal}>
              + Yangi ijaraga berish
            </Button>
          </div>
        </div>

        {isLoading ? (
          <PageLoader text="Zal ijarasi ro'yxati tayyorlanmoqda" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Zal</th>
                  <th>Buyurtmachi</th>
                  <th>Tadbir</th>
                  <th>Sana oralig'i</th>
                  <th>Holat</th>
                  <th>Kelishilgan</th>
                  <th>To'langan</th>
                  <th>Qarz</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {paged.length ? (
                paged.map((item) => (
                  <tr key={item._id}>
                    <td data-label="Zal">{item.hallName}</td>
                    <td data-label="Buyurtmachi">
                      {item.customerFirstname} {item.customerLastname}
                      <br />
                      <span className="room-floor">{item.phone || "-"}</span>
                    </td>
                    <td data-label="Tadbir">{item.eventName}</td>
                    <td data-label="Sana oralig'i">
                      {dayjs(item.startDate).format("DD.MM.YYYY")} -{" "}
                      {dayjs(item.endDate).format("DD.MM.YYYY")}
                    </td>
                    <td data-label="Holat">{stateTag(item.eventState)}</td>
                    <td data-label="Kelishilgan">
                      {Number(item.totalAmount || 0).toLocaleString()} so'm
                    </td>
                    <td data-label="To'langan">
                      {Number(item.paidAmount || 0).toLocaleString()} so'm
                    </td>
                    <td data-label="Qarz">
                      {Number(item.debtAmount || 0).toLocaleString()} so'm
                    </td>
                    <td data-label="Amal">
                      <div className="table-action-wrap">
                        <button
                          disabled={
                            item.status === "canceled" ||
                            Number(item.debtAmount || 0) <= 0
                          }
                          className="icon-btn"
                          title="Tahrirlash"
                          onClick={() => openEditModal(item)}
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          className="icon-btn"
                          title="To'lov"
                          onClick={() => openPaymentModal(item)}
                          disabled={
                            item.status === "canceled" ||
                            Number(item.debtAmount || 0) <= 0
                          }
                        >
                          <FiCreditCard size={16} />
                        </button>
                        <Popconfirm
                          title="Buyurtmani bekor qilish"
                          description="Buyurtmani bekor qilasizmi?"
                          okText="Bekor qilish"
                          cancelText="Orqaga"
                          onConfirm={() => onCancelBooking(item._id)}
                          okButtonProps={{ danger: true, loading: canceling }}
                          overlayClassName="hotel-popconfirm"
                        >
                          <button
                            className="icon-btn danger"
                            title="Bekor qilish"
                            // disabled={item.status === "canceled"}
                            disabled={
                              item.status === "canceled" ||
                              Number(item.debtAmount || 0) <= 0
                            }
                          >
                            <FiXCircle size={16} />
                          </button>
                        </Popconfirm>
                        <Popconfirm
                          title="Buyurtmani o'chirish"
                          description="Rostdan ham o'chirasizmi?"
                          okText="O'chirish"
                          cancelText="Orqaga"
                          onConfirm={() => onDeleteBooking(item._id)}
                          okButtonProps={{ danger: true, loading: deleting }}
                          overlayClassName="hotel-popconfirm"
                        >
                          <button
                            className="icon-btn danger"
                            title="O'chirish"
                            disabled={
                              item.status === "canceled" ||
                              Number(item.debtAmount || 0) <= 0
                            }
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                ))
                ) : (
                <tr>
                  <td colSpan={9} className="table-empty">
                    Ma'lumot yo'q
                  </td>
                </tr>
              )}
              </tbody>
            </table>
          </div>
        )}
        <div className="guests-pagination-wrap">
          <Pagination
            current={page}
            total={filteredItems.length}
            pageSize={pageSize}
            showSizeChanger={false}
            onChange={setPage}
          />
        </div>
      </div>

      <Modal
        open={open}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
        width={720}
        rootClassName="employee-modal-theme"
        title={editing ? "Ijarani tahrirlash" : "Yangi ijaraga berish"}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
          className="hall-form-grid"
        >
          <Form.Item
            name="hallName"
            label="Zal nomi"
            rules={[{ required: true, message: "Zal nomi majburiy" }]}
          >
            <Select
              showSearch
              mode="tags"
              maxCount={1}
              options={hallOptions}
              placeholder="Zal nomini tanlang yoki yozing"
            />
          </Form.Item>
          <Form.Item
            name="customerFirstname"
            label="Buyurtmachi ismi"
            rules={[{ required: true, message: "Ism majburiy" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="customerLastname"
            label="Buyurtmachi familiyasi"
            rules={[{ required: true, message: "Familiya majburiy" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Buyurtmachi telefoni">
            <Input
              onChange={(e) =>
                form.setFieldValue("phone", normalizePhone(e.target.value))
              }
            />
          </Form.Item>
          <Form.Item
            name="eventName"
            label="Tadbir nomi"
            rules={[{ required: true, message: "Tadbir nomi majburiy" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="dateRange"
            label="Ijaraga olingan sana oralig'i"
            rules={[{ required: true, message: "Sana oralig'i majburiy" }]}
          >
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              disabledDate={disabledDate}
            />
          </Form.Item>
          <Form.Item
            name="totalAmount"
            label="Kelishilgan summa"
            rules={[{ required: true, message: "Kelishilgan summa majburiy" }]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: "100%" }}
              formatter={(value) =>
                String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
              }
              parser={(value) => {
                const digits = String(value || "").replace(/[^\d]/g, "");
                return digits.replace(/^0+/, "") || "0";
              }}
              onKeyDown={blockNonIntegerKeys}
              onPaste={preventInvalidAmountPaste}
            />
          </Form.Item>
          <Form.Item name="paidAmount" label="Oldindan to'lov (zakalad)">
            <InputNumber
              min={0}
              precision={0}
              style={{ width: "100%" }}
              formatter={(value) =>
                String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
              }
              parser={(value) => {
                const digits = String(value || "").replace(/[^\d]/g, "");
                return digits.replace(/^0+/, "") || "0";
              }}
              onKeyDown={blockNonIntegerKeys}
              onPaste={preventInvalidAmountPaste}
            />
          </Form.Item>
          <Form.Item name="note" label="Izoh" className="hall-full">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="row-actions hall-full">
            <Button
              htmlType="submit"
              className="hotel-primary-btn"
              loading={creating || updating}
            >
              Saqlash
            </Button>
            <Button onClick={closeModal}>Yopish</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        open={paymentModalOpen}
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
              { type: "number", min: 1, message: "Eng kamida 1 so'm" },
            ]}
          >
            <InputNumber
              min={1}
              precision={0}
              max={Number(paymentBooking?.debtAmount || 0) || undefined}
              style={{ width: "100%" }}
              formatter={(value) =>
                String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")
              }
              parser={(value) => {
                const digits = String(value || "").replace(/[^\d]/g, "");
                const normalized = digits.replace(/^0+/, "");
                if (!normalized) return undefined;
                const parsed = Number(normalized);
                const debt = Number(paymentBooking?.debtAmount || 0);
                if (debt > 0) return Math.min(parsed, debt);
                return parsed;
              }}
              onKeyDown={blockNonIntegerKeys}
              onPaste={preventInvalidAmountPaste}
            />
          </Form.Item>
          <Form.Item
            name="type"
            label="To'lov turi"
            rules={[{ required: true, message: "To'lov turi majburiy" }]}
          >
            <Segmented options={paymentTypeOptions} block />
          </Form.Item>
          <Form.Item name="note" label="Izoh">
            <Input />
          </Form.Item>
          {paymentBooking ? (
            <div className="hall-payment-info">
              Qarz: {Number(paymentBooking.debtAmount || 0).toLocaleString()}{" "}
              so'm
            </div>
          ) : null}
          <div className="row-actions">
            <Button
              htmlType="submit"
              className="hotel-primary-btn"
              loading={paying}
            >
              Saqlash
            </Button>
            <Button onClick={closePaymentModal}>Yopish</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default HallBookingsPage;
