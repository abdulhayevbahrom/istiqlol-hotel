import {
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Segmented,
  Select,
  Spin,
  Tabs,
  Tag,
} from "antd";
import { Fragment, useState } from "react";
import {
  FiCreditCard,
  FiEdit2,
  FiEye,
  FiList,
  FiLogOut,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import {
  useGetGroupBookingsQuery,
  useDeleteGroupBookingMutation,
  useAddGroupPaymentMutation,
  useUpdateGroupBookingMutation,
  useUpdateGuestMutation,
  useCheckoutGuestsBulkMutation,
} from "../store/employeeApi";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("uz-UZ") : "-";

function GroupsPage() {
  const [tab, setTab] = useState("active");
  const [page, setPage] = useState(1);
  const [expandedGroupIds, setExpandedGroupIds] = useState([]);
  const [roomsModalGroup, setRoomsModalGroup] = useState(null);
  const [editingGuest, setEditingGuest] = useState(null);
  const [editingGuestGroup, setEditingGuestGroup] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [paymentGroup, setPaymentGroup] = useState(null);
  const [checkingOutGroupId, setCheckingOutGroupId] = useState("");
  const [guestEditForm] = Form.useForm();
  const [groupEditForm] = Form.useForm();
  const [groupPaymentForm] = Form.useForm();
  const [updateGuest, { isLoading: isUpdatingGuest }] =
    useUpdateGuestMutation();
  const [updateGroupBooking, { isLoading: isUpdatingGroup }] =
    useUpdateGroupBookingMutation();
  const [deleteGroupBooking, { isLoading: isDeletingGroup }] =
    useDeleteGroupBookingMutation();
  const [addGroupPayment, { isLoading: isAddingGroupPayment }] =
    useAddGroupPaymentMutation();
  const [checkoutGuestsBulk] = useCheckoutGuestsBulkMutation();
  const { data, isLoading, isFetching } = useGetGroupBookingsQuery({
    tab,
    page,
    limit: 20,
  });
  const groupsPayload = data?.innerData || { items: [], pagination: {} };
  const groups = groupsPayload.items || [];
  const pagination = groupsPayload.pagination || {};
  const toggleExpanded = (groupId) => {
    setExpandedGroupIds((current) =>
      current.includes(groupId)
        ? []
        : [groupId],
    );
  };

  const getGuestRoom = (group, guest) =>
    (group.rooms || []).find(
      (room) => String(room._id) === String(guest.room?._id || guest.room),
    );

  const openGuestEdit = (group, guest) => {
    setEditingGuest(guest);
    setEditingGuestGroup(group);
    guestEditForm.setFieldsValue({
      firstname: guest.firstname || "",
      lastname: guest.lastname === "-" ? "" : guest.lastname || "",
      passport: guest.passport || "",
      birthDate: guest.birthDate ? dayjs(guest.birthDate) : null,
      phone: guest.phone || "",
      email: guest.email || "",
      room: String(guest.room?._id || guest.room || ""),
      dailyRate: Number(guest.dailyRate || 0),
      note: guest.note || "",
    });
  };

  const closeGuestEdit = () => {
    setEditingGuest(null);
    setEditingGuestGroup(null);
    guestEditForm.resetFields();
  };

  const saveGuestEdit = async () => {
    try {
      const values = await guestEditForm.validateFields();
      await updateGuest({
        id: editingGuest._id,
        firstname: String(values.firstname || "").trim(),
        lastname: String(values.lastname || "").trim() || "-",
        passport: String(values.passport || "").trim(),
        birthDate: values.birthDate
          ? values.birthDate.format("YYYY-MM-DD")
          : undefined,
        phone: String(values.phone || "").trim(),
        email: String(values.email || "").trim(),
        room: values.room,
        dailyRate: Number(values.dailyRate || 0),
        note: String(values.note || "").trim(),
      }).unwrap();
      toast.success("Mehmon ma'lumotlari yangilandi");
      closeGuestEdit();
    } catch (error) {
      if (error?.errorFields) return;
      toast.error(error?.data?.message || "Mehmonni yangilashda xatolik");
    }
  };

  const openGroupEdit = (group) => {
    setEditingGroup(group);
    groupEditForm.setFieldsValue({
      name: group.name || "",
      phone: group.phone || "",
      email: group.email || "",
      dailyRate: Number(group.dailyRate || 0),
      mainPaymentType: group.mainPaymentType || "naqd",
      note: group.note || "",
    });
  };

  const closeGroupEdit = () => {
    setEditingGroup(null);
    groupEditForm.resetFields();
  };

  const saveGroupEdit = async () => {
    try {
      const values = await groupEditForm.validateFields();
      await updateGroupBooking({
        id: editingGroup._id,
        name: String(values.name || "").trim(),
        phone: String(values.phone || "").trim(),
        email: String(values.email || "").trim().toLowerCase(),
        dailyRate: Number(values.dailyRate || 0),
        mainPaymentType: values.mainPaymentType || "naqd",
        note: String(values.note || "").trim(),
      }).unwrap();
      toast.success("Guruh ma'lumotlari yangilandi");
      closeGroupEdit();
    } catch (error) {
      if (error?.errorFields) return;
      toast.error(error?.data?.message || "Guruhni yangilashda xatolik");
    }
  };

  const removeGroup = async (group) => {
    try {
      await deleteGroupBooking(group._id).unwrap();
      setExpandedGroupIds([]);
      toast.success("Guruh va uning mehmonlari o'chirildi");
    } catch (error) {
      toast.error(error?.data?.message || "Guruhni o'chirishda xatolik");
    }
  };

  const checkoutGroup = async (group) => {
    const ids = (group.guests || [])
      .filter((guest) => guest.status !== "checked_out")
      .map((guest) => guest._id);

    if (!ids.length) {
      toast.info("Guruhdagi barcha mehmonlar checkout qilingan");
      return;
    }

    try {
      setCheckingOutGroupId(group._id);
      const result = await checkoutGuestsBulk({ ids }).unwrap();
      setExpandedGroupIds((current) => current.filter((id) => id !== group._id));
      toast.success(result?.message || "Guruh to'liq checkout qilindi");
    } catch (error) {
      toast.error(error?.data?.message || "Guruhni checkout qilishda xatolik");
    } finally {
      setCheckingOutGroupId("");
    }
  };

  const openGroupPayment = (group) => {
    setPaymentGroup(group);
    groupPaymentForm.setFieldsValue({
      amount: Number(group.debtAmount || 0),
      type: group.mainPaymentType || "naqd",
      note: "",
    });
  };

  const closeGroupPayment = () => {
    setPaymentGroup(null);
    groupPaymentForm.resetFields();
  };

  const saveGroupPayment = async () => {
    try {
      const values = await groupPaymentForm.validateFields();
      await addGroupPayment({
        id: paymentGroup._id,
        amount: Number(values.amount),
        type: values.type,
        note: String(values.note || "").trim(),
      }).unwrap();
      toast.success("Guruh to'lovi qabul qilindi");
      closeGroupPayment();
    } catch (error) {
      if (error?.errorFields) return;
      toast.error(error?.data?.message || "Guruh to'lovida xatolik");
    }
  };

  return (
    <div className="groups-page">
      <div className="page-card groups-page-card">
        <Tabs
          activeKey={tab}
          tabBarExtraContent={(
            <Tag color="blue">Jami: {pagination.total || 0}</Tag>
          )}
          onChange={(nextTab) => {
            setTab(nextTab);
            setPage(1);
            setExpandedGroupIds([]);
          }}
          items={[
            { key: "active", label: "Aktiv guruhlar" },
            { key: "history", label: "Guruhlar tarixi" },
          ]}
        />

        {isLoading || isFetching ? (
          <div className="groups-loading"><Spin /></div>
        ) : groups.length === 0 ? (
          <Empty description={tab === "active" ? "Aktiv guruhlar yo'q" : "Guruhlar tarixi bo'sh"} />
        ) : (
          <div className="table-wrap groups-table-wrap">
            <table className="table groups-table">
              <thead>
                <tr>
                  <th>Guruh nomi</th>
                  <th>Aloqa</th>
                  <th>Bron sanasi</th>
                  <th>Kunlar</th>
                  <th>Xonalar</th>
                  <th>Mehmonlar</th>
                  <th>Kunlik narx</th>
                  <th>Qarz</th>
                  <th>Holati</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const expanded = expandedGroupIds.includes(group._id);
                  const sortedGuests = [...(group.guests || [])].sort((a, b) => {
                    const roomA = getGuestRoom(group, a);
                    const roomB = getGuestRoom(group, b);
                    const korpusCompare = String(roomA?.korpus || "").localeCompare(
                      String(roomB?.korpus || ""),
                      "uz",
                      { numeric: true },
                    );
                    if (korpusCompare !== 0) return korpusCompare;
                    return String(roomA?.roomNumber || "").localeCompare(
                      String(roomB?.roomNumber || ""),
                      "uz",
                      { numeric: true },
                    );
                  });
                  return (
                    <Fragment key={group._id}>
                      <tr className={expanded ? "is-expanded" : ""}>
                        <td data-label="Guruh nomi"><strong>{group.name}</strong></td>
                        <td data-label="Aloqa">
                          <div className="group-contact-cell">
                            <span>{group.phone || "-"}</span>
                            {group.email ? <small>{group.email}</small> : null}
                          </div>
                        </td>
                        <td data-label="Bron sanasi">{formatDate(group.bookedForAt)} 12:00</td>
                        <td data-label="Kunlar">{group.stayDays} kun</td>
                        <td data-label="Xonalar">
                          <div className="group-rooms-action">
                            <button
                              type="button"
                              className="icon-btn"
                              title="Xonalarni ko'rish"
                              onClick={() => setRoomsModalGroup(group)}
                            >
                              <FiEye size={16} />
                            </button>
                            <span>{group.rooms?.length || 0} ta</span>
                          </div>
                        </td>
                        <td data-label="Mehmonlar">
                          <div className="group-rooms-action">
                            <button
                              type="button"
                              className="icon-btn"
                              title={expanded ? "Mehmonlarni yopish" : "Mehmonlarni ko'rish"}
                              onClick={() => toggleExpanded(group._id)}
                            >
                              {expanded ? <FiX size={17} /> : <FiList size={16} />}
                            </button>
                            <span>{group.guests?.length || 0} ta</span>
                          </div>
                        </td>
                        <td data-label="Kunlik narx"><strong>{Number(group.dailyRate || 0).toLocaleString()}</strong></td>
                        <td data-label="Qarz"><strong>{Number(group.debtAmount || 0).toLocaleString()}</strong></td>
                        <td data-label="Holati">
                          <Tag color={tab === "active" ? "green" : "default"}>
                            {tab === "active" ? "Aktiv" : "Yakunlangan"}
                          </Tag>
                        </td>
                        <td data-label="Amallar">
                          <div className="table-action-wrap">
                            <button
                              type="button"
                              className="icon-btn"
                              title="Guruhni tahrirlash"
                              onClick={() => openGroupEdit(group)}
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              title="Guruh to'lovi"
                              disabled={Number(group.debtAmount || 0) <= 0}
                              onClick={() => openGroupPayment(group)}
                            >
                              <FiCreditCard size={16} />
                            </button>
                            {tab === "active" ? (
                              <Popconfirm
                                title="Guruhni checkout qilish"
                                description={`${group.guests?.filter((guest) => guest.status !== "checked_out").length || 0} ta mehmon bir vaqtda checkout qilinadi va xonalar holati yangilanadi. Davom etasizmi?`}
                                okText="Checkout"
                                cancelText="Bekor qilish"
                                okButtonProps={{
                                  loading: checkingOutGroupId === group._id,
                                }}
                                onConfirm={() => checkoutGroup(group)}
                              >
                                <button
                                  type="button"
                                  className="icon-btn"
                                  title="Guruhni to'liq checkout qilish"
                                  disabled={Boolean(checkingOutGroupId)}
                                >
                                  <FiLogOut size={16} />
                                </button>
                              </Popconfirm>
                            ) : null}
                            <Popconfirm
                              title="Guruhni o'chirish"
                              description="Guruhga bog'langan barcha mehmonlar ham o'chiriladi. Davom etasizmi?"
                              okText="O'chirish"
                              cancelText="Bekor qilish"
                              okButtonProps={{ danger: true, loading: isDeletingGroup }}
                              onConfirm={() => removeGroup(group)}
                            >
                              <button type="button" className="icon-btn danger" title="Guruhni o'chirish">
                                <FiTrash2 size={16} />
                              </button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr key={`${group._id}-guests`} className="group-expanded-row">
                          <td colSpan={10}>
                            <div className="group-expanded-content">
                              <div className="group-expanded-title">
                                <strong>{group.name} guruhidagi mehmonlar</strong>
                                <span>{group.guests?.length || 0} ta mehmon</span>
                              </div>
                              <div className="table-wrap group-guests-table-wrap">
                                <table className="table group-guests-table">
                                  <thead>
                                    <tr>
                                      <th>№</th>
                                      <th>F.I.SH</th>
                                      <th>Passport</th>
                                      <th>Tug'ilgan sana</th>
                                      <th>Aloqa</th>
                                      <th>Xona</th>
                                      <th>Kunlik narx</th>
                                      <th>Izoh</th>
                                      <th>Holati</th>
                                      <th>Amal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortedGuests.map((guest, index) => {
                                      const room = getGuestRoom(group, guest);
                                      return (
                                        <tr key={guest._id}>
                                          <td>{index + 1}</td>
                                          <td><strong>{guest.firstname} {guest.lastname}</strong></td>
                                          <td>{guest.passport || "-"}</td>
                                          <td>{guest.birthDate ? formatDate(guest.birthDate) : "-"}</td>
                                          <td>
                                            <div className="group-contact-cell">
                                              <span>{guest.phone || "-"}</span>
                                              <small>{guest.email || "-"}</small>
                                            </div>
                                          </td>
                                          <td>{room ? `${room.roomNumber} [${room.korpus}]` : "-"}</td>
                                          <td>{Number(guest.dailyRate || 0).toLocaleString()}</td>
                                          <td className="group-guest-note-cell">{guest.note || "-"}</td>
                                          <td>
                                            <Tag color={guest.status === "active" ? "green" : guest.status === "booked" ? "gold" : "default"}>
                                              {guest.status === "active" ? "Active" : guest.status === "booked" ? "Bron" : "Checkout"}
                                            </Tag>
                                          </td>
                                          <td>
                                            <button
                                              type="button"
                                              className="icon-btn"
                                              title="Mehmonni tahrirlash"
                                              onClick={() => openGuestEdit(group, guest)}
                                            >
                                              <FiEdit2 size={16} />
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {Number(pagination.total || 0) > 20 ? (
          <div className="groups-pagination">
            <Pagination
              current={Number(pagination.page || page)}
              pageSize={20}
              total={Number(pagination.total || 0)}
              showSizeChanger={false}
              onChange={(nextPage) => {
                setPage(nextPage);
                setExpandedGroupIds([]);
              }}
            />
          </div>
        ) : null}

        <Modal
          open={Boolean(roomsModalGroup)}
          title={`${roomsModalGroup?.name || "Guruh"} xonalari`}
          footer={null}
          width={760}
          onCancel={() => setRoomsModalGroup(null)}
        >
          <div className="table-wrap group-rooms-modal-table-wrap">
            <table className="table group-rooms-modal-table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Xona</th>
                  <th>Korpus</th>
                  <th>Qavat</th>
                  <th>Kategoriya</th>
                  <th>Sig'im</th>
                  <th>Mehmonlar</th>
                </tr>
              </thead>
              <tbody>
                {(roomsModalGroup?.rooms || []).map((room, index) => {
                  const guestCount = (roomsModalGroup?.guests || []).filter(
                    (guest) =>
                      String(guest.room?._id || guest.room) === String(room._id),
                  ).length;
                  return (
                    <tr key={room._id}>
                      <td>{index + 1}</td>
                      <td><strong>{room.roomNumber}</strong></td>
                      <td>{room.korpus}</td>
                      <td>{room.floor}-qavat</td>
                      <td>{room.category}</td>
                      <td>{room.capacity} ta</td>
                      <td><Tag color="blue">{guestCount} ta</Tag></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Modal>

        <Modal
          open={Boolean(paymentGroup)}
          title={`${paymentGroup?.name || "Guruh"} uchun to'lov`}
          okText="To'lovni saqlash"
          cancelText="Bekor qilish"
          confirmLoading={isAddingGroupPayment}
          width={560}
          onOk={saveGroupPayment}
          onCancel={closeGroupPayment}
        >
          <div className="group-payment-summary">
            <div><span>Jami</span><strong>{Number(paymentGroup?.totalAmount || 0).toLocaleString()} so'm</strong></div>
            <div><span>To'langan</span><strong>{Number(paymentGroup?.paidAmount || 0).toLocaleString()} so'm</strong></div>
            <div><span>Qarz</span><strong>{Number(paymentGroup?.debtAmount || 0).toLocaleString()} so'm</strong></div>
          </div>
          <Form form={groupPaymentForm} layout="vertical" requiredMark={false}>
            <Form.Item
              name="amount"
              label="To'lov summasi"
              rules={[
                { required: true, message: "To'lov summasi majburiy" },
                {
                  validator: (_, value) =>
                    Number(value || 0) <= Number(paymentGroup?.debtAmount || 0)
                      ? Promise.resolve()
                      : Promise.reject(new Error("To'lov guruh qarzidan oshmasligi kerak")),
                },
              ]}
            >
              <InputNumber
                min={1}
                precision={0}
                addonAfter="so'm"
                style={{ width: "100%" }}
                formatter={(value) => String(value ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                parser={(value) => String(value || "").replace(/[^\d]/g, "")}
              />
            </Form.Item>
            <Form.Item name="type" label="To'lov usuli">
              <Segmented
                block
                className="group-payment-segment"
                options={[
                  { label: "Naqd", value: "naqd" },
                  { label: "Plastik", value: "karta" },
                  { label: "Bank", value: "bank" },
                ]}
              />
            </Form.Item>
            <Form.Item name="note" label="Izoh (ixtiyoriy)">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          open={Boolean(editingGroup)}
          title="Guruhni tahrirlash"
          okText="Saqlash"
          cancelText="Bekor qilish"
          confirmLoading={isUpdatingGroup}
          width={680}
          onOk={saveGroupEdit}
          onCancel={closeGroupEdit}
        >
          <Form form={groupEditForm} layout="vertical" requiredMark={false}>
            <div className="group-guest-edit-grid">
              <Form.Item name="name" label="Guruh nomi" rules={[{ required: true, message: "Guruh nomi majburiy" }]}>
                <Input />
              </Form.Item>
              <Form.Item
                name="phone"
                label="Telefon (ixtiyoriy)"
                rules={[{ pattern: /^\+?\d{7,15}$/, message: "Telefon 7-15 ta raqamdan iborat bo'lishi kerak" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email (ixtiyoriy)"
                rules={[{ pattern: /^[^\s@]+@gmail\.com$/i, message: "Email @gmail.com formatida bo'lishi kerak" }]}
              >
                <Input type="email" />
              </Form.Item>
              <Form.Item name="dailyRate" label="Barcha mehmonlar uchun kunlik narx" rules={[{ required: true, message: "Kunlik narx majburiy" }]}>
                <InputNumber
                  min={0}
                  precision={0}
                  addonAfter="so'm"
                  style={{ width: "100%" }}
                  formatter={(value) => String(value ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                  parser={(value) => String(value || "").replace(/[^\d]/g, "")}
                />
              </Form.Item>
            </div>
            <Form.Item name="mainPaymentType" label="Asosiy to'lov usuli">
              <Segmented
                block
                className="group-payment-segment"
                options={[
                  { label: "Naqd", value: "naqd" },
                  { label: "Bank", value: "bank" },
                ]}
              />
            </Form.Item>
            <Form.Item name="note" label="Izoh (ixtiyoriy)">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>

        <Modal
          open={Boolean(editingGuest)}
          title="Guruh mehmonini tahrirlash"
          okText="Saqlash"
          cancelText="Bekor qilish"
          confirmLoading={isUpdatingGuest}
          width={760}
          onOk={saveGuestEdit}
          onCancel={closeGuestEdit}
        >
          <Form form={guestEditForm} layout="vertical" requiredMark={false}>
            <div className="group-guest-edit-grid">
              <Form.Item name="firstname" label="Ism" rules={[{ required: true, message: "Ism majburiy" }]}>
                <Input />
              </Form.Item>
              <Form.Item name="lastname" label="Familiya (ixtiyoriy)">
                <Input />
              </Form.Item>
              <Form.Item name="passport" label="Passport (ixtiyoriy)">
                <Input />
              </Form.Item>
              <Form.Item name="birthDate" label="Tug'ilgan sana (ixtiyoriy)">
                <DatePicker format="DD.MM.YYYY" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item name="phone" label="Telefon (ixtiyoriy)">
                <Input />
              </Form.Item>
              <Form.Item name="email" label="Email (ixtiyoriy)">
                <Input type="email" />
              </Form.Item>
              <Form.Item name="room" label="Xona" rules={[{ required: true, message: "Xona majburiy" }]}>
                <Select
                  options={(editingGuestGroup?.rooms || []).map((room) => ({
                    value: room._id,
                    label: `${room.roomNumber} [${room.korpus}] · ${room.floor}-qavat`,
                  }))}
                />
              </Form.Item>
              <Form.Item name="dailyRate" label="Kunlik narx" rules={[{ required: true, message: "Kunlik narx majburiy" }]}>
                <InputNumber
                  min={0}
                  precision={0}
                  addonAfter="so'm"
                  style={{ width: "100%" }}
                  formatter={(value) => String(value ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
                  parser={(value) => String(value || "").replace(/[^\d]/g, "")}
                />
              </Form.Item>
            </div>
            <Form.Item name="note" label="Izoh (ixtiyoriy)">
              <Input.TextArea rows={3} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}

export default GroupsPage;
