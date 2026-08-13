import { Button, Form, Input, Modal, Select } from "antd";

function EmployeeModal({
  open,
  form,
  editingEmployee,
  departmentOptions,
  employeeNameOptions,
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
      title={editingEmployee ? "Hodimni tahrirlash" : "Yangi hodim qo'shish"}
      rootClassName="employee-modal-theme"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        requiredMark={false}
      >
        <Form.Item
          name="department"
          label="Bo'lim"
          rules={[{ required: true, message: "Bo'lim majburiy" }]}
        >
          <Select
            placeholder="Bo'limni tanlang"
            options={departmentOptions}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        <Form.Item
          name="fullName"
          label="F.I.SH"
          rules={[{ required: true, message: "F.I.SH majburiy" }]}
        >
          <Select
            showSearch
            placeholder="Hodimni tanlang"
            optionFilterProp="label"
            options={employeeNameOptions}
          />
        </Form.Item>

        <Form.Item
          name="employeeCode"
          label="Hodim kodi"
          rules={[{ required: true, message: "Hodim kodi majburiy" }]}
        >
          <Input disabled />
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

export default EmployeeModal;
