import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Form, Input, Modal } from "antd";
import { navItems } from "../constants/navItems";
import {
  FiBarChart2,
  FiBookOpen,
  FiClipboard,
  FiDollarSign,
  FiMenu,
  FiHome,
  FiLayers,
  FiPackage,
  FiCalendar,
  FiSettings,
  FiUserCheck,
  FiUsers,
  FiX,
  FiLifeBuoy,
} from "react-icons/fi";
import { RiHotelLine } from "react-icons/ri";
import { useState } from "react";
import "./sidebar.css";
import { hasSectionAccess } from "../utils/sectionAccess";
import {
  useGetSettingsQuery,
  useSendSupportMessageMutation,
} from "../store/employeeApi";
import { toast } from "react-toastify";

// support icon
import { BiSupport } from "react-icons/bi";

const iconByPath = {
  "/dashboard": FiBarChart2,
  "/employees": FiUsers,
  "/rooms": FiHome,
  "/occupancy": FiCalendar,
  "/guest-checkin": FiUserCheck,
  "/guests-active": FiLayers,
  "/guests-history": FiBookOpen,
  "/guests-debtors": FiDollarSign,
  "/attendance": FiCalendar,
  "/services": FiPackage,
  "/hall-bookings": FiBookOpen,
  "/expenses": FiDollarSign,
  "/finance": FiDollarSign,
  "/reports": FiClipboard,
  "/settings": FiSettings,
};

function AdminSidebar() {
  const [supportForm] = Form.useForm();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const [sendSupportMessage, { isLoading: isSendingSupport }] =
    useSendSupportMessageMutation();

  const { data: settingsData } = useGetSettingsQuery();
  const hotelName =
    settingsData?.innerData?.hotelName ||
    localStorage.getItem("hotelName") ||
    "Mehmonxona nomi";

  const openSupportModal = () => {
    supportForm.setFieldsValue({
      hotelName,
      subject: "",
      complaint: "",
      phone: "",
    });
    setIsSupportOpen(true);
  };

  const closeSupportModal = () => {
    setIsSupportOpen(false);
    supportForm.resetFields();
  };

  const onSendSupport = async (values) => {
    try {
      await sendSupportMessage({
        hotelName: values.hotelName || hotelName,
        subject: values.subject,
        complaint: values.complaint,
        phone: values.phone,
      }).unwrap();

      toast.success("Shikoyatingiz qabul qilindi. Tez orada aloqaga chiqamiz.");
      closeSupportModal();
    } catch (error) {
      toast.error(
        error?.data?.message ||
          error?.data?.innerData ||
          "Supportga yuborishda xatolik",
      );
    }
  };
  const allowedItems =
    user?.role === "admin"
      ? navItems
      : navItems.filter((item) =>
          hasSectionAccess(user?.sections || [], item.section),
        );
  const mobilePrimaryItems = allowedItems.slice(0, 4);

  return (
    <aside className="sidebar">
      <div className="brand">
        <RiHotelLine /> {hotelName}
      </div>

      <nav className="side-nav">
        {allowedItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "side-link side-link-active" : "side-link"
            }
          >
            <span className="side-link-inner">
              {(() => {
                const Icon = iconByPath[item.to] || FiLayers;
                return (
                  <span className="side-icon">
                    <Icon size={16} />
                  </span>
                );
              })()}
              <span>{item.label}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="side-support-wrap">
        <button
          type="button"
          className="side-support-btn"
          onClick={openSupportModal}
        >
          <BiSupport size={16} />
          <span>Support</span>
        </button>
      </div>

      <div className="mobile-bottom-nav">
        {mobilePrimaryItems.map((item) => (
          <NavLink
            key={`mobile-${item.to}`}
            to={item.to}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              isActive ? "side-link side-link-active" : "side-link"
            }
          >
            <span className="side-link-inner">
              {(() => {
                const Icon = iconByPath[item.to] || FiLayers;
                return (
                  <span className="side-icon">
                    <Icon size={16} />
                  </span>
                );
              })()}
              <span>{item.label}</span>
            </span>
          </NavLink>
        ))}

        <button
          type="button"
          className="mobile-more-btn"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Menyu"
        >
          <span className="side-icon">
            <FiMenu size={18} />
          </span>
          <span>Menyu</span>
        </button>
      </div>

      <div
        className={`mobile-drawer-backdrop ${isMobileMenuOpen ? "open" : ""}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div className={`mobile-drawer ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-head">
          <strong>Bo'limlar</strong>
          <button
            type="button"
            className="mobile-drawer-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Yopish"
          >
            <FiX size={18} />
          </button>
        </div>
        <nav className="mobile-drawer-nav">
          {allowedItems.map((item) => (
            <NavLink
              key={`drawer-${item.to}`}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                isActive
                  ? "mobile-menu-link mobile-menu-link-active"
                  : "mobile-menu-link"
              }
            >
              {(() => {
                const Icon = iconByPath[item.to] || FiLayers;
                return (
                  <span className="side-icon">
                    <Icon size={16} />
                  </span>
                );
              })()}
              <span>{item.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className="mobile-menu-link support-link"
            onClick={() => {
              setIsMobileMenuOpen(false);
              openSupportModal();
            }}
          >
            <span className="side-icon">
              <BiSupport size={16} />
            </span>
            <span>Support</span>
          </button>
        </nav>
      </div>

      <Modal
        open={isSupportOpen}
        onCancel={closeSupportModal}
        footer={null}
        title="Dasturchiga yozish"
        width={520}
        destroyOnHidden
        rootClassName="employee-modal-theme"
      >
        <Form
          form={supportForm}
          layout="vertical"
          requiredMark={false}
          onFinish={onSendSupport}
        >
          <Form.Item hidden name="hotelName" label="Mehmonxona nomi">
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="subject"
            label="Mavzu"
            rules={[{ required: true, message: "Mavzu majburiy" }]}
          >
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item
            name="complaint"
            label="Shikoyat"
            rules={[{ required: true, message: "Shikoyat matni majburiy" }]}
          >
            <Input.TextArea rows={4} maxLength={500} />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Aloqa uchun telefon"
            rules={[
              { required: true, message: "Telefon majburiy" },
              {
                pattern: /^\+?\d{7,15}$/,
                message: "Telefon formati noto'g'ri",
              },
            ]}
          >
            <Input placeholder="+998901234567" />
          </Form.Item>
          <div className="row-actions">
            <Button
              htmlType="submit"
              className="hotel-primary-btn"
              loading={isSendingSupport}
            >
              Yuborish
            </Button>
            <Button onClick={closeSupportModal}>Yopish</Button>
          </div>
        </Form>
      </Modal>
    </aside>
  );
}

export default AdminSidebar;
