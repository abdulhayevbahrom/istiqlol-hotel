import { Button, Form, Input, TimePicker } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FiClock,
  FiFileText,
  FiHome,
  FiImage,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from "../store/employeeApi";
import PageLoader from "../components/PageLoader";
import "./settings.css";

const toTimeValue = (value) => {
  const text = String(value || "");
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  return dayjs(`2000-01-01T${text}:00`);
};

function SettingsPage() {
  const [form] = Form.useForm();
  const { data, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();
  const [logoPreview, setLogoPreview] = useState("");
  const settings = useMemo(() => data?.innerData || {}, [data]);

  useEffect(() => {
    form.setFieldsValue({
      hotelName: settings.hotelName || "Mehmonxona nomi",
      checkoutTime: toTimeValue(settings.checkoutTime || "15:00"),
      reminderTime: toTimeValue(settings.reminderTime || "12:00"),
      receiptThankYouText: settings.receiptThankYouText || "",
      logo: settings.logo || "",
    });
    setLogoPreview(settings.logo || "");
    if (settings.hotelName) {
      localStorage.setItem("hotelName", settings.hotelName);
    }
  }, [settings, form]);

  const onLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result || "");
      form.setFieldValue("logo", base64);
      setLogoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    form.setFieldValue("logo", "");
    setLogoPreview("");
  };

  const onSubmit = async (values) => {
    try {
      const payload = {
        hotelName: String(values.hotelName || "").trim(),
        checkoutTime: values.checkoutTime?.format("HH:mm"),
        reminderTime: values.reminderTime?.format("HH:mm"),
        receiptThankYouText: String(values.receiptThankYouText || "").trim(),
        logo: String(values.logo || "").trim(),
      };
      const result = await updateSettings(payload).unwrap();
      localStorage.setItem(
        "hotelName",
        String(
          result?.innerData?.hotelName ||
            payload.hotelName ||
            "Mehmonxona nomi",
        ),
      );
      toast.success(result?.message || "Sozlamalar saqlandi");
    } catch (err) {
      toast.error(err?.data?.message || "Saqlashda xatolik");
    }
  };

  return (
    <div className="employee-page settings-page">
      <div className="page-card">
        {isLoading ? (
          <PageLoader text="Sozlamalar tayyorlanmoqda, bir lahza kuting" />
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            requiredMark={false}
            className="settings-panel"
          >
            <div className="settings-headline">
              <span>Umumiy sozlamalar</span>
              <i />
            </div>

            <div className="settings-layout-grid">
              <section className="settings-block settings-block-wide">
                <div className="settings-block-head">
                  <span className="settings-block-icon">
                    <FiHome size={14} />
                  </span>
                  <div>
                    <h3>Mehmonxona nomi</h3>
                  </div>
                </div>
                <Form.Item
                  name="hotelName"
                  label="Nomi"
                  rules={[
                    { required: true, message: "Mehmonxona nomi majburiy" },
                  ]}
                >
                  <Input
                    maxLength={120}
                    placeholder="Masalan: Mehmonxona nomi"
                  />
                </Form.Item>
              </section>

              <section className="settings-block">
                <div className="settings-block-head">
                  <span className="settings-block-icon">
                    <FiClock size={14} />
                  </span>
                  <div>
                    <h3>Vaqt sozlamalari</h3>
                  </div>
                </div>
                <div className="settings-time-row">
                  <Form.Item
                    name="reminderTime"
                    label="Ogohlantirish vaqti"
                    rules={[
                      {
                        required: true,
                        message: "Ogohlantirish vaqti majburiy",
                      },
                    ]}
                    className="settings-time-item"
                  >
                    <TimePicker
                      format="HH:mm"
                      minuteStep={1}
                      allowClear={false}
                      className="settings-time-picker"
                    />
                  </Form.Item>
                  <Form.Item
                    name="checkoutTime"
                    label="Chiqish vaqti"
                    rules={[
                      { required: true, message: "Chiqish vaqti majburiy" },
                    ]}
                    className="settings-time-item"
                  >
                    <TimePicker
                      format="HH:mm"
                      minuteStep={1}
                      allowClear={false}
                      className="settings-time-picker"
                    />
                  </Form.Item>
                </div>
              </section>

              <section className="settings-block">
                <div className="settings-block-head">
                  <span className="settings-block-icon">
                    <FiFileText size={14} />
                  </span>
                  <div>
                    <h3>Chekdagi rahmatnoma</h3>
                  </div>
                </div>
                <Form.Item
                  name="receiptThankYouText"
                  label="Matn"
                  rules={[
                    { required: true, message: "Rahmatnoma matni majburiy" },
                  ]}
                >
                  <Input
                    maxLength={140}
                    placeholder="Masalan: Tashrifingiz uchun rahmat!"
                  />
                </Form.Item>
              </section>

              <section className="settings-block settings-block-wide">
                <div className="settings-block-head">
                  <span className="settings-block-icon">
                    <FiImage size={14} />
                  </span>
                  <div>
                    <h3>Mehmonxona logotipi</h3>
                  </div>
                </div>

                <Form.Item name="logo" hidden>
                  <Input />
                </Form.Item>

                <div className="settings-upload settings-full">
                  <input
                    id="settings-logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={onLogoChange}
                  />
                  <div className="settings-logo-dropzone">
                    {logoPreview ? (
                      <div className="settings-logo-preview">
                        <img src={logoPreview} alt="Hotel Logo" />
                      </div>
                    ) : (
                      <div className="settings-logo-empty-icon">
                        <FiImage size={44} />
                      </div>
                    )}
                    <p>Logotip yuklash uchun bosing yoki sudrab tashlang</p>
                    <small>PNG, JPG yoki SVG</small>
                    <div className="settings-upload-actions">
                      <label
                        htmlFor="settings-logo-upload"
                        className="settings-upload-btn"
                      >
                        <FiUploadCloud size={15} />
                        {logoPreview ? "Boshqa rasm tanlash" : "Rasm tanlash"}
                      </label>
                      {logoPreview ? (
                        <button
                          type="button"
                          className="settings-remove-btn"
                          onClick={removeLogo}
                        >
                          <FiTrash2 size={14} />
                          Olib tashlash
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="row-actions settings-full">
              <Button
                htmlType="submit"
                className="hotel-primary-btn"
                loading={saving}
              >
                Saqlash
              </Button>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
