import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
} from "antd";
import { toast } from "react-toastify";
import {
  useCreateRoomMutation,
  useDeleteRoomMutation,
  useGetRoomsQuery,
  useUpdateRoomMutation,
} from "../store/employeeApi";
import {
  blockNonIntegerKeys,
  preventInvalidAmountPaste,
} from "../utils/numberFormat";
import PageLoader from "../components/PageLoader";

const roomCategoryOptions = [
  { label: "Standart", value: "standart" },
  { label: "Polulyuks", value: "polulyuks" },
  { label: "Lyuks", value: "lyuks" },
  { label: "Apartament", value: "apartament" },
  { label: "1 Kishilik", value: "bir_kishilik" },
];

const roomStatusOptions = [
  { label: "Bo'sh", value: "bosh" },
  { label: "Band", value: "band" },
  { label: "Remont", value: "remont" },
];

const roomConditionOptions = [
  { label: "Aktiv", value: "aktiv" },
  { label: "Remont", value: "remont" },
];

const initialForm = {
  roomNumber: "",
  floor: 1,
  capacity: 1,
  category: "standart",
  prices: { oddiy: 0, chetEllik: 0 },
};

const formatMoney = (value) => Number(value || 0).toLocaleString();

function RoomsPage() {
  const [form] = Form.useForm();
  const { data, isLoading } = useGetRoomsQuery();
  const [createRoom, { isLoading: isCreating }] = useCreateRoomMutation();
  const [updateRoom, { isLoading: isUpdating }] = useUpdateRoomMutation();
  const [deleteRoom, { isLoading: isDeleting }] = useDeleteRoomMutation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [query, setQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState(undefined);
  const [categoryFilter, setCategoryFilter] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isMobileFilters, setIsMobileFilters] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 900 : false,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobileFilters(window.innerWidth < 900);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const rooms = useMemo(() => data?.innerData || [], [data]);
  const floorOptions = useMemo(() => {
    const floors = [
      ...new Set(
        rooms.map((room) => room.floor).filter((v) => Number.isFinite(v)),
      ),
    ].sort((a, b) => a - b);
    return floors.map((floor) => ({ label: `${floor}-qavat`, value: floor }));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms.filter((room) => {
      const roomNumber = String(room.roomNumber || "").toLowerCase();
      const category = String(room.category || "").toLowerCase();
      const status = String(room.status || "").toLowerCase();
      const byText =
        !q ||
        roomNumber.includes(q) ||
        category.includes(q) ||
        status.includes(q);
      const byFloor = floorFilter === undefined || room.floor === floorFilter;
      const byCategory = !categoryFilter || room.category === categoryFilter;
      const byStatus = !statusFilter || room.status === statusFilter;
      return byText && byFloor && byCategory && byStatus;
    });
  }, [rooms, query, floorFilter, categoryFilter, statusFilter]);

  const openCreateModal = () => {
    setError("");
    setEditingId("");
    form.setFieldsValue(initialForm);
    setIsModalOpen(true);
  };

  const openEditModal = (room) => {
    setError("");
    setEditingId(room._id);
    form.setFieldsValue({
      roomNumber: room.roomNumber,
      floor: room.floor,
      capacity: room.capacity || 1,
      category: room.category,
      condition: room.status === "remont" ? "remont" : "aktiv",
      prices: room.prices || { oddiy: 0, chetEllik: 0 },
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId("");
    setError("");
    form.resetFields();
  };

  const onSubmit = async (values) => {
    const payload = {
      roomNumber: String(values.roomNumber || "").trim(),
      floor: Number(values.floor),
      capacity: Number(values.capacity || 1),
      category: values.category,
      prices: {
        oddiy: Number(values.prices?.oddiy || 0),
        chetEllik: Number(values.prices?.chetEllik || 0),
      },
    };
    if (editingId) {
      payload.status = values.condition === "remont" ? "remont" : "bosh";
    }

    try {
      if (editingId) {
        const result = await updateRoom({ id: editingId, ...payload }).unwrap();
        toast.success(result?.message || "Xona yangilandi");
      } else {
        const result = await createRoom(payload).unwrap();
        toast.success(result?.message || "Xona qo'shildi");
      }
      closeModal();
    } catch (err) {
      const message = err?.data?.message || "Saqlashda xatolik";
      setError(message);
      toast.error(message);
    }
  };

  const onDelete = async (id) => {
    try {
      const result = await deleteRoom(id).unwrap();
      toast.success(result?.message || "Xona o'chirildi");
      if (editingId === id) closeModal();
    } catch (err) {
      const message = err?.data?.message || "O'chirishda xatolik";
      toast.error(message);
    }
  };

  const renderCapacityBadges = (capacity, activeCount) => {
    const total = Number(capacity || 0);
    const busy = Number(activeCount || 0);
    return Array.from({ length: total }, (_, index) => {
      const order = index + 1;
      const isBusy = order <= busy;
      return (
        <span
          key={order}
          className={`capacity-badge ${isBusy ? "capacity-badge-busy" : "capacity-badge-free"}`}
          title={isBusy ? "Band o'rin" : "Bo'sh o'rin"}
        >
          {/* {order} */}
        </span>
      );
    });
  };

  return (
    <div className="employee-page rooms-page">
      <div className="page-card">
        <div className="table-toolbar">
          <h2>Xonalar ro'yxati</h2>
          <div className="toolbar-actions">
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
              <input
                className="search-input"
                placeholder="Qidirish: xona raqami, kategoriya, status"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {!isMobileFilters ? (
              <>
                <Select
                  allowClear
                  className="filter-select"
                  placeholder="Qavat"
                  options={floorOptions}
                  value={floorFilter}
                  onChange={setFloorFilter}
                />
                <Select
                  allowClear
                  className="filter-select"
                  placeholder="Kategoriya"
                  options={roomCategoryOptions}
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                />
                <Select
                  allowClear
                  className="filter-select"
                  placeholder="Status"
                  options={roomStatusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
              </>
            ) : null}
            <button className="primary-btn" onClick={openCreateModal}>
              + Yangi xona
            </button>
          </div>
        </div>

        {isLoading ? (
          <PageLoader text="Xonalar ro'yxati tayyorlanmoqda" />
        ) : (
          <div className="rooms-grid">
            {filteredRooms.map((room) => (
              <article
                key={room._id}
                className={`room-card room-card-${room.status}`}
              >
                <div className="room-card-top">
                  <h3>Xona {room.roomNumber}</h3>
                  <span className={`room-status room-status-${room.status}`}>
                    {roomStatusOptions.find((s) => s.value === room.status)
                      ?.label || room.status}
                  </span>
                </div>
                <div className="room-meta">
                  <div>
                    <strong>Qavat:</strong> {room.floor}
                  </div>
                  <div className="room-capacity-row">
                    <strong>Sig'imi:</strong>
                    <div className="room-capacity-badges">
                      <span>
                        {room.capacity || 1} / {room.activeGuestsCount || 0}
                      </span>
                      {renderCapacityBadges(
                        room.capacity || 1,
                        room.activeGuestsCount || 0,
                      )}
                    </div>
                  </div>
                  <div>
                    <strong>Kategoriya:</strong>{" "}
                    {room.category === "bir_kishilik"
                      ? "1 kishilik"
                      : room.category}
                  </div>
                  <div>
                    <strong>Oddiy:</strong> {formatMoney(room.prices?.oddiy)}
                  </div>
                  <div>
                    <strong>Chet ellik:</strong>{" "}
                    {formatMoney(room.prices?.chetEllik)}
                  </div>
                </div>
                <div className="table-action-wrap">
                  <button
                    className="icon-btn"
                    onClick={() => openEditModal(room)}
                    aria-label="Tahrirlash"
                    title="Tahrirlash"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                      <path
                        d="M4 20H8L18 10L14 6L4 16V20Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 8L16 12"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                  <Popconfirm
                    title="Xonani o'chirish"
                    description="Ushbu amalni tasdiqlaysizmi?"
                    okText="O'chirish"
                    cancelText="Bekor"
                    okButtonProps={{ danger: true, loading: isDeleting }}
                    onConfirm={() => onDelete(room._id)}
                    overlayClassName="hotel-popconfirm"
                  >
                    <button
                      className="icon-btn danger"
                      disabled={isDeleting}
                      aria-label="O'chirish"
                      title="O'chirish"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                      >
                        <path
                          d="M4 7H20"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M9 7V5H15V7"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M7 7L8 20H16L17 7"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </button>
                  </Popconfirm>
                </div>
              </article>
            ))}
            {filteredRooms.length === 0 ? (
              <div className="table-empty">Hech narsa topilmadi</div>
            ) : null}
          </div>
        )}
      </div>

      {isModalOpen ? (
        <Modal
          open={isModalOpen}
          onCancel={closeModal}
          footer={null}
          destroyOnHidden
          width={760}
          rootClassName="employee-modal-theme"
          title={editingId ? "Xonani tahrirlash" : "Yangi xona qo'shish"}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={initialForm}
            onFinish={onSubmit}
            requiredMark={false}
          >
            <Form.Item
              name="roomNumber"
              label="Xona raqami"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: "Xona raqami majburiy",
                },
              ]}
            >
              <Input placeholder="Masalan: 305" />
            </Form.Item>

            {/* <Form.Item
              name="floor"
              label="Qavat"
              rules={[{ required: true, message: "Qavat majburiy" }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item> */}

            <Form.Item
              name="floor"
              label="Qavat"
              rules={[
                { required: true, message: "Qavat majburiy" },
                {
                  type: "number",
                  min: 1,
                  message: "Eng kamida 1 kiriting",
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
                  return withoutLeadingZeros;
                }}
                onKeyDown={blockNonIntegerKeys}
                onPaste={preventInvalidAmountPaste}
              />
            </Form.Item>

            {/* <Form.Item
              name="capacity"
              label="Sig'imi"
              rules={[{ required: true, message: "Sig'im majburiy" }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item> */}
            <Form.Item
              name="capacity"
              label="Sig'imi"
              rules={[
                { required: true, message: "Sig'imi majburiy" },
                {
                  type: "number",
                  min: 1,
                  message: "Eng kamida 1 kiriting",
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
                  return withoutLeadingZeros;
                }}
                onKeyDown={blockNonIntegerKeys}
                onPaste={preventInvalidAmountPaste}
              />
            </Form.Item>

            <Form.Item
              name="category"
              label="Kategoriya"
              rules={[{ required: true, message: "Kategoriya majburiy" }]}
            >
              <Select options={roomCategoryOptions} />
            </Form.Item>

            {/* <Form.Item
              name={["prices", "oddiy"]}
              label="Standart narx"
              rules={[{ required: true, message: "Standart narx majburiy" }]}
            >
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                formatter={(value) =>
                  `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                }
              />
            </Form.Item> */}

            <Form.Item
              name={["prices", "oddiy"]}
              label="Standart narx"
              rules={[
                { required: true, message: "Standart narx majburiy" },
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
                  return withoutLeadingZeros;
                }}
                onKeyDown={blockNonIntegerKeys}
                onPaste={preventInvalidAmountPaste}
              />
            </Form.Item>

            {/* <Form.Item
              name={["prices", "chetEllik"]}
              label="Xorijiy mehmonlar uchun narx"
              rules={[
                {
                  required: true,
                  message: "Xorijiy mehmonlar uchun narx majburiy",
                },
              ]}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item> */}
            <Form.Item
              name={["prices", "chetEllik"]}
              label="Xorijiy mehmonlar uchun narx"
              rules={[
                {
                  required: true,
                  message: "Xorijiy mehmonlar uchun narx majburiy",
                },
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
                  return withoutLeadingZeros;
                }}
                onKeyDown={blockNonIntegerKeys}
                onPaste={preventInvalidAmountPaste}
              />
            </Form.Item>

            {editingId ? (
              <Form.Item
                name="condition"
                label="Xona holati"
                rules={[{ required: true, message: "Xona holatini tanlang" }]}
              >
                <Segmented
                  options={roomConditionOptions}
                  block
                  className="room-condition-segmented"
                />
              </Form.Item>
            ) : null}

            {error ? <div className="form-error">{error}</div> : null}
            <div className="row-actions">
              <Button
                htmlType="submit"
                loading={isCreating || isUpdating}
                className="hotel-primary-btn"
              >
                {editingId ? "Yangilash" : "Saqlash"}
              </Button>
              <Button onClick={closeModal}>Yopish</Button>
            </div>
          </Form>
        </Modal>
      ) : null}

      <Modal
        open={isFilterModalOpen}
        onCancel={() => setIsFilterModalOpen(false)}
        footer={null}
        destroyOnHidden
        width={420}
        title="Filtrlar"
        rootClassName="room-filter-modal-theme"
      >
        <div className="room-filter-modal-body">
          <Select
            allowClear
            className="filter-select"
            placeholder="Qavat"
            options={floorOptions}
            value={floorFilter}
            onChange={setFloorFilter}
          />
          <Select
            allowClear
            className="filter-select"
            placeholder="Kategoriya"
            options={roomCategoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
          <Select
            allowClear
            className="filter-select"
            placeholder="Status"
            options={roomStatusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <div className="row-actions">
            <Button
              className="hotel-primary-btn"
              onClick={() => setIsFilterModalOpen(false)}
            >
              Qo'llash
            </Button>
            <Button
              onClick={() => {
                setFloorFilter(undefined);
                setCategoryFilter(undefined);
                setStatusFilter(undefined);
              }}
            >
              Tozalash
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default RoomsPage;
