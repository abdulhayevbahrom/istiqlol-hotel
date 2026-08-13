import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Popconfirm,
  Switch,
} from "antd";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  useCreateServiceMutation,
  useDeleteServiceMutation,
  useGetServicesQuery,
  useUpdateServiceMutation,
} from "../store/employeeApi";
import {
  blockNonIntegerKeys,
  preventInvalidAmountPaste,
} from "../utils/numberFormat";
import PageLoader from "../components/PageLoader";

function ServicesPage() {
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useGetServicesQuery(false);
  const [createService, { isLoading: creating }] = useCreateServiceMutation();
  const [updateService, { isLoading: updating }] = useUpdateServiceMutation();
  const [deleteService, { isLoading: deleting }] = useDeleteServiceMutation();

  const items = useMemo(() => data?.innerData || [], [data]);
  const pageSize = 15;
  const paged = items.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({
      name: "",
      defaultPrice: 0,
      isActive: true,
      note: "",
    });
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    form.setFieldsValue({
      name: item.name,
      defaultPrice: Number(item.defaultPrice || 0),
      isActive: Boolean(item.isActive),
      note: item.note || "",
    });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    try {
      const payload = {
        name: String(values.name || "").trim(),
        defaultPrice: Number(values.defaultPrice || 0),
        isActive: Boolean(values.isActive),
        note: String(values.note || "").trim(),
      };
      const result = editing
        ? await updateService({ id: editing._id, ...payload }).unwrap()
        : await createService(payload).unwrap();
      toast.success(result?.message || "Saqlandi");
      setOpen(false);
    } catch (err) {
      toast.error(err?.data?.message || "Xatolik");
    }
  };

  const onDelete = async (id) => {
    try {
      const result = await deleteService(id).unwrap();
      toast.success(result?.message || "O'chirildi");
    } catch (err) {
      toast.error(err?.data?.message || "Xatolik");
    }
  };

  return (
    <div className="employee-page services-page">
      <div className="page-card">
        <div className="table-toolbar">
          <h2>Xizmatlar</h2>
          <Button className="hotel-primary-btn" onClick={openCreate}>
            + Xizmat qo'shish
          </Button>
        </div>
        {isLoading ? (
          <PageLoader text="Xizmatlar ro'yxati tayyorlanmoqda" />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nomi</th>
                    <th>Standart narx</th>
                    <th>Holat</th>
                    <th>Izoh</th>
                    <th>Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((item) => (
                    <tr key={item._id}>
                      <td data-label="Nomi">{item.name}</td>
                      <td data-label="Standart narx">
                        {Number(item.defaultPrice || 0).toLocaleString()} so'm
                      </td>
                      <td data-label="Holat">{item.isActive ? "Faol" : "Nofaol"}</td>
                      <td data-label="Izoh">{item.note || "-"}</td>
                      <td data-label="Amal">
                        <div className="table-action-wrap">
                          <button
                            className="icon-btn"
                            onClick={() => openEdit(item)}
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <Popconfirm
                            title="Xizmatni o'chirish"
                            okText="O'chirish"
                            cancelText="Bekor"
                            onConfirm={() => onDelete(item._id)}
                            okButtonProps={{ danger: true, loading: deleting }}
                            overlayClassName="hotel-popconfirm"
                          >
                            <button className="icon-btn danger">
                              <FiTrash2 size={16} />
                            </button>
                          </Popconfirm>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!paged.length ? (
                    <tr>
                      <td colSpan={5} className="table-empty">
                        Xizmat topilmadi
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="guests-pagination-wrap">
              <Pagination
                current={page}
                total={items.length}
                pageSize={pageSize}
                showSizeChanger={false}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
        rootClassName="employee-modal-theme"
        title={editing ? "Xizmatni tahrirlash" : "Xizmat qo'shish"}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onSubmit}
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Nomi"
            rules={[{ required: true, message: "Nomi majburiy" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="defaultPrice"
            label="Standart narx"
            rules={[{ required: true, message: "Narx majburiy" }]}
          >
            {/* <InputNumber min={0} precision={0} style={{ width: "100%" }} /> */}
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
          {editing ? (
            <Form.Item name="isActive" label="Faol" valuePropName="checked">
              <Switch />
            </Form.Item>
          ) : null}
          <Form.Item name="note" label="Izoh">
            <Input.TextArea rows={3} />
          </Form.Item>
          <div className="row-actions">
            <Button
              htmlType="submit"
              className="hotel-primary-btn"
              loading={creating || updating}
            >
              Saqlash
            </Button>
            <Button onClick={() => setOpen(false)}>Bekor</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default ServicesPage;
