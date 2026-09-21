import { Button, Form, Input, Modal, Popconfirm, Tabs, TimePicker } from "antd";
import OwnerOnly from "../components/OwnerOnly";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  FiClock,
  FiEdit2,
  FiFileText,
  FiHome,
  FiImage,
  FiLifeBuoy,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";
import {
  useGetSettingsQuery,
  useSendSupportMessageMutation,
  useUpdateRoomCategoryImagesMutation,
  useUpdateSettingsMutation,
} from "../store/employeeApi";
import API_CONFIG from "../config/apiConfig";
import PageLoader from "../components/PageLoader";
import "./settings.css";

const toTimeValue = (value) => {
  const text = String(value || "");
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  return dayjs(`2000-01-01T${text}:00`);
};

const DEFAULT_ROOM_CATEGORIES = [
  "standart",
  "polulyuks",
  "lyuks",
  "apartament",
  "bir_kishilik",
];

const resolveAssetUrl = (value) => {
  const src = String(value || "").trim();
  if (!src || src.startsWith("data:") || /^https?:\/\//i.test(src)) return src;
  return `${API_CONFIG.MAIN_API.baseUrl}${src}`;
};

function SettingsPage() {
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const { data, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation();
  const [sendSupportMessage, { isLoading: sendingSupport }] = useSendSupportMessageMutation();
  const [updateRoomCategoryImages, { isLoading: savingCategoryImages }] =
    useUpdateRoomCategoryImagesMutation();
  const [logoPreview, setLogoPreview] = useState("");
  const [roomCategories, setRoomCategories] = useState(DEFAULT_ROOM_CATEGORIES);
  const [roomCategoryImages, setRoomCategoryImages] = useState({});
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState(-1);
  const [support, setSupport] = useState({ subject: "", complaint: "", phone: "" });
  const settings = useMemo(() => data?.innerData || {}, [data]);

  useEffect(() => {
    const nextCategories =
      Array.isArray(settings.roomCategories) && settings.roomCategories.length
        ? settings.roomCategories
        : DEFAULT_ROOM_CATEGORIES;
    setRoomCategories(nextCategories);
    setRoomCategoryImages(
      (settings.roomCategoryImages || []).reduce((acc, item) => {
        if (item?.category) acc[item.category] = item.images || [];
        return acc;
      }, {}),
    );
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

  const openCategoryModal = (index = -1) => {
    setEditingCategoryIndex(index);
    categoryForm.setFieldsValue({
      category: index >= 0 ? roomCategories[index] || "" : "",
    });
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setCategoryModalOpen(false);
    setEditingCategoryIndex(-1);
    categoryForm.resetFields();
  };

  const onSaveCategory = async (values) => {
    const nextCategory = String(values.category || "").trim();
    if (!nextCategory) {
      toast.error("Kategoriya nomi majburiy");
      return;
    }
    const duplicateIndex = roomCategories.findIndex(
      (item, index) =>
        item.toLowerCase() === nextCategory.toLowerCase() &&
        index !== editingCategoryIndex,
    );
    if (duplicateIndex !== -1) {
      toast.error("Bu kategoriya allaqachon mavjud");
      return;
    }

    setRoomCategories((prev) => {
      if (editingCategoryIndex >= 0) {
        return prev.map((item, index) =>
          index === editingCategoryIndex ? nextCategory : item,
        );
      }
      return [...prev, nextCategory];
    });
    closeCategoryModal();
  };

  const onDeleteCategory = (index) => {
    setRoomCategories((prev) => (prev.length <= 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)));
  };

  const saveCategoryImages = async (category, existingImages, files = []) => {
    const formData = new FormData();
    formData.append("category", category);
    formData.append("existingImages", JSON.stringify(existingImages));
    files.forEach((file) => formData.append("images", file));
    const result = await updateRoomCategoryImages(formData).unwrap();
    const nextImages = (result?.innerData?.roomCategoryImages || []).reduce(
      (acc, item) => {
        if (item?.category) acc[item.category] = item.images || [];
        return acc;
      },
      {},
    );
    setRoomCategoryImages(nextImages);
    toast.success(result?.message || "Kategoriya rasmlari saqlandi");
  };

  const onCategoryImagesChange = async (category, event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const existingImages = roomCategoryImages[category] || [];
    if (existingImages.length + files.length > 8) {
      toast.error("Har bir kategoriya uchun ko'pi bilan 8 ta rasm yuklash mumkin");
      return;
    }
    try {
      await saveCategoryImages(category, existingImages, files);
    } catch (err) {
      toast.error(err?.data?.message || "Rasm yuklashda xatolik");
    }
  };

  const removeCategoryImage = async (category, image) => {
    try {
      const existingImages = (roomCategoryImages[category] || []).filter(
        (item) => item !== image,
      );
      await saveCategoryImages(category, existingImages);
    } catch (err) {
      toast.error(err?.data?.message || "Rasmni o'chirishda xatolik");
    }
  };

  const onSubmit = async (values) => {
    try {
      const payload = {
        hotelName: String(values.hotelName || "").trim(),
        checkoutTime: values.checkoutTime?.format("HH:mm"),
        reminderTime: values.reminderTime?.format("HH:mm"),
        roomCategories: roomCategories.map((item) => String(item || "").trim()).filter(Boolean),
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

  const onSendSupport = async () => {
    const subject = support.subject.trim();
    const complaint = support.complaint.trim();
    const phone = support.phone.trim();
    if (!subject || !complaint || !phone) return toast.error("Support formasidagi barcha maydonlarni to'ldiring");
    if (!/^\+?\d{7,15}$/.test(phone)) return toast.error("Telefon formati noto'g'ri");
    try {
      await sendSupportMessage({ hotelName: settings.hotelName || "Mehmonxona nomi", subject, complaint, phone }).unwrap();
      toast.success("Xabaringiz qabul qilindi. Tez orada aloqaga chiqamiz.");
      setSupport({ subject: "", complaint: "", phone: "" });
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.innerData || "Supportga yuborishda xatolik");
    }
  };

  return (
    <div className="employee-page settings-page">
      <div className="page-card">
        {isLoading ? (
          <PageLoader text="Sozlamalar tayyorlanmoqda, bir lahza kuting" />
        ) : (
          <>
            <Form
              form={form}
              layout="vertical"
              onFinish={onSubmit}
              requiredMark={false}
              className="settings-panel"
            >
              <div className="settings-headline">
                <span>Sozlamalar</span>
                <i />
              </div>

              <Tabs
                className="settings-tabs"
                items={[
                  {
                    key: "general",
                    label: "Umumiy sozlamalar",
                    children: (
                      <>
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
                      {logoPreview ? (<OwnerOnly>
                        <button
                          type="button"
                          className="settings-remove-btn"
                          onClick={removeLogo}
                        >
                          <FiTrash2 size={14} />
                          Olib tashlash
                        </button>
                      </OwnerOnly>) : null}
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
                      </>
                    ),
                  },
                  {
                    key: "categories",
                    label: "Xona kategoriyalari",
                    children: (
                      <>
                        <section className="settings-block settings-block-wide">
                          <div className="settings-block-head">
                            <span className="settings-block-icon">
                              <FiHome size={14} />
                            </span>
                            <div>
                              <h3>Xona kategoriyalari</h3>
                            </div>
                          </div>
                          <div className="settings-room-categories-head">
                            <Button className="hotel-primary-btn" onClick={() => openCategoryModal()}>
                              + Kategoriya qo'shish
                            </Button>
                          </div>
                          <div className="settings-room-categories-table-wrap">
                            <table className="settings-room-categories-table">
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Kategoriya</th>
                                  <th>Rasmlar</th>
                                  <th>Amal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {roomCategories.map((category, index) => (
                                  <tr key={`${category}-${index}`}>
                                    <td>{index + 1}</td>
                                    <td>
                                      <strong className="settings-category-name">{category}</strong>
                                      <small className="settings-category-count">
                                        {(roomCategoryImages[category] || []).length}/8 rasm
                                      </small>
                                    </td>
                                    <td>
                                      <div className="settings-category-images">
                                        {(roomCategoryImages[category] || []).map((image) => (
                                          <div className="settings-category-image" key={image}>
                                            <img src={resolveAssetUrl(image)} alt={`${category} rasmi`} />
                                            <OwnerOnly><button
                                              type="button"
                                              onClick={() => removeCategoryImage(category, image)}
                                              disabled={savingCategoryImages}
                                            >
                                              <FiTrash2 size={12} />
                                            </button></OwnerOnly>
                                          </div>
                                        ))}
                                        {(roomCategoryImages[category] || []).length < 8 ? (
                                          <label className="settings-category-image-upload">
                                            <input
                                              type="file"
                                              accept="image/*"
                                              multiple
                                              onChange={(event) => onCategoryImagesChange(category, event)}
                                              disabled={savingCategoryImages}
                                            />
                                            <FiUploadCloud size={14} />
                                            Rasm qo'shish
                                          </label>
                                        ) : null}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="settings-room-category-actions">
                                        <button
                                          type="button"
                                          className="icon-btn"
                                          onClick={() => openCategoryModal(index)}
                                          title="Tahrirlash"
                                        >
                                          <FiEdit2 size={15} />
                                        </button>
                                        <OwnerOnly><Popconfirm
                                          title="Kategoriyani o'chirish"
                                          description="Bu kategoriyani o'chirmoqchimisiz?"
                                          okText="Ha"
                                          cancelText="Yo'q"
                                          onConfirm={() => onDeleteCategory(index)}
                                          disabled={roomCategories.length <= 1}
                                        >
                                          <button
                                            type="button"
                                            className="icon-btn danger"
                                            disabled={roomCategories.length <= 1}
                                            title="O'chirish"
                                          >
                                            <FiTrash2 size={15} />
                                          </button>
                                        </Popconfirm></OwnerOnly>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                        <div className="row-actions settings-full">
                          <Button
                            htmlType="submit"
                            className="hotel-primary-btn"
                            loading={saving}
                          >
                            Saqlash
                          </Button>
                        </div>
                      </>
                    ),
                  },
                  {
                    key: "support",
                    label: "Support",
                    children: (
                      <section className="settings-block settings-block-wide settings-support-block">
                        <div className="settings-block-head">
                          <span className="settings-block-icon"><FiLifeBuoy size={14} /></span>
                          <div><h3>Dasturchiga yozish</h3></div>
                        </div>
                        <div className="settings-support-form">
                          <label className="settings-support-field">
                            <span>Mavzu</span>
                            <Input maxLength={80} value={support.subject} onChange={(event) => setSupport((prev) => ({ ...prev, subject: event.target.value }))} placeholder="Murojaat mavzusi" />
                          </label>
                          <label className="settings-support-field">
                            <span>Aloqa uchun telefon</span>
                            <Input maxLength={16} value={support.phone} onChange={(event) => setSupport((prev) => ({ ...prev, phone: event.target.value }))} placeholder="+998901234567" />
                          </label>
                          <label className="settings-support-field settings-support-message">
                            <span>Xabar</span>
                            <Input.TextArea rows={6} maxLength={500} showCount value={support.complaint} onChange={(event) => setSupport((prev) => ({ ...prev, complaint: event.target.value }))} placeholder="Muammo yoki taklifingizni batafsil yozing" />
                          </label>
                          <div className="row-actions settings-support-message">
                            <Button htmlType="button" className="hotel-primary-btn" loading={sendingSupport} onClick={onSendSupport}>Yuborish</Button>
                          </div>
                        </div>
                      </section>
                    ),
                  },
                ]}
              />
            </Form>
            <Modal
              open={categoryModalOpen}
              onCancel={closeCategoryModal}
              footer={null}
              destroyOnHidden
              width={480}
              title={
                editingCategoryIndex >= 0
                  ? "Kategoriyani tahrirlash"
                  : "Yangi kategoriya qo'shish"
              }
              rootClassName="employee-modal-theme"
            >
              <Form
                form={categoryForm}
                layout="vertical"
                onFinish={onSaveCategory}
                requiredMark={false}
              >
                <Form.Item
                  name="category"
                  label="Kategoriya nomi"
                  rules={[
                    { required: true, message: "Kategoriya nomi majburiy" },
                  ]}
                >
                  <Input placeholder="Masalan: premium" />
                </Form.Item>
                <div className="row-actions">
                  <Button htmlType="submit" className="hotel-primary-btn">
                    Saqlash
                  </Button>
                  <Button onClick={closeCategoryModal}>Bekor</Button>
                </div>
              </Form>
            </Modal>
          </>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
