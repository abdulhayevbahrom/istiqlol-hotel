import { Button, Form, Input, InputNumber, Modal } from "antd";

function DepartmentModal({
  open,
  form,
  editingDepartment,
  loading,
  onCancel,
  onSubmit,
}) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      title={
        editingDepartment ? "Bo'limni tahrirlash" : "Yangi bo'lim qo'shish"
      }
      rootClassName="employee-modal-theme"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        requiredMark={false}
      >
        <Form.Item
          name="name"
          label="Bo'lim nomi"
          rules={[{ required: true, message: "Bo'lim nomi majburiy" }]}
        >
          <Input placeholder="Farroshlar / Managerlar / VKZ" />
        </Form.Item>

        <Form.Item
          name="checkInTime"
          label="Ish boshlanishi (HH:mm)"
          rules={[
            { required: true, message: "Ish boshlanishi majburiy" },
            { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: "Masalan: 08:00" },
          ]}
        >
          <Input placeholder="08:00" />
        </Form.Item>

        <Form.Item
          name="checkOutTime"
          label="Ish tugashi (HH:mm)"
          rules={[
            { required: true, message: "Ish tugashi majburiy" },
            { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: "Masalan: 17:00" },
          ]}
        >
          <Input placeholder="17:00" />
        </Form.Item>

        <Form.Item
          name="lateAfterMinutes"
          label="Kechikish limiti (daqiqada)"
          rules={[{ required: true, message: "Kechikish limiti majburiy" }]}
        >
          <InputNumber min={0} precision={0} style={{ width: "100%" }} />
        </Form.Item>

        <Form.Item
          name="earlyLeaveMinutes"
          label="Erta ketish limiti (daqiqada)"
          rules={[{ required: true, message: "Erta ketish limiti majburiy" }]}
        >
          <InputNumber min={0} precision={0} style={{ width: "100%" }} />
        </Form.Item>

        <div className="row-actions">
          <Button
            htmlType="submit"
            className="hotel-primary-btn"
            loading={loading}
          >
            Saqlash
          </Button>
          <Button onClick={onCancel}>Bekor</Button>
        </div>
      </Form>
    </Modal>
  );
}

export default DepartmentModal;

