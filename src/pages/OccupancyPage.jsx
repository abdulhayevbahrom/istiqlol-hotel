import { useMemo, useState } from "react";
import { Button, Modal, Select } from "antd";
import { FiCalendar, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useGetOccupancyQuery, useGetRoomsQuery } from "../store/employeeApi";
import PageLoader from "../components/PageLoader";
import "./occupancy.css";

const DAY_COUNT = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const CELL_WIDTH = 52;
const ROW_HEIGHT = 24;

const startOfDay = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const dateKey = (date) => {
  const value = startOfDay(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

const addDays = (date, amount) => {
  const value = startOfDay(date);
  value.setDate(value.getDate() + amount);
  return value;
};

const toDayFraction = (value, anchor) => (new Date(value).getTime() - anchor.getTime()) / DAY_MS;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const categoryLabels = {
  standart: "Standart",
  polulyuks: "Polulyuks",
  lyuks: "Lyuks",
  apartament: "Apartament",
  bir_kishilik: "1 kishilik",
};

const formatRoomLabel = (room) => {
  if (!room) return "-";
  const parts = [room.roomNumber || "-"];
  if (room.korpus) parts.push(`${room.korpus} korpus`);
  if (room.floor) parts.push(`${room.floor}-qavat`);
  return parts.join(" / ");
};

function OccupancyPage() {
  const [viewStart, setViewStart] = useState(() => startOfDay(new Date()));
  const [korpus, setKorpus] = useState();
  const [floor, setFloor] = useState();
  const [selectedGuest, setSelectedGuest] = useState(null);
  const viewEnd = useMemo(() => addDays(viewStart, DAY_COUNT), [viewStart]);
  const days = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, index) => addDays(viewStart, index)),
    [viewStart],
  );

  const { data: roomsData, isLoading: roomsLoading } = useGetRoomsQuery();
  const { data: occupancyData, isLoading: occupancyLoading, isFetching } =
    useGetOccupancyQuery({ from: dateKey(viewStart), to: dateKey(viewEnd) });

  const rooms = useMemo(() => roomsData?.innerData || [], [roomsData]);
  const occupancy = useMemo(
    () => occupancyData?.innerData || [],
    [occupancyData],
  );
  const floorOptions = useMemo(
    () =>
      [...new Set(rooms.map((room) => room.floor).filter(Number.isFinite))]
        .sort((a, b) => a - b)
        .map((value) => ({ label: `${value}-qavat`, value })),
    [rooms],
  );
  const korpusOptions = useMemo(
    () =>
      [...new Set(rooms.map((room) => String(room.korpus || "").trim()).filter(Boolean))]
        .sort()
        .map((value) => ({ label: `${value} korpus`, value })),
    [rooms],
  );
  const visibleRooms = useMemo(
    () =>
      rooms
        .filter((room) => floor === undefined || room.floor === floor)
        .filter((room) => !korpus || room.korpus === korpus)
        .sort(
          (a, b) =>
            String(a.korpus || "").localeCompare(String(b.korpus || ""), undefined, {
              numeric: true,
            }) ||
            Number(a.floor || 0) - Number(b.floor || 0) ||
            String(a.roomNumber || "").localeCompare(String(b.roomNumber || ""), undefined, {
              numeric: true,
            }),
        ),
    [rooms, floor, korpus],
  );

  const entriesByRoom = useMemo(() => {
    const grouped = new Map();
    occupancy.forEach((guest) => {
      const roomId = guest?.room?._id || guest?.room;
      if (!roomId) return;
      const startsAt = guest.bookedForAt || guest.checkInAt;
      const endsAt = guest.checkoutDueAt;
      if (!startsAt || !endsAt) return;
      const rawStart = toDayFraction(startOfDay(startsAt), viewStart) + 0.5;
      const rawEnd = toDayFraction(startOfDay(endsAt), viewStart) + 0.5;
      const start = Math.max(0, rawStart);
      const end = Math.min(DAY_COUNT, rawEnd);
      if (end <= 0 || end <= start) return;
      const entry = { ...guest, start, end, lane: 1 };
      grouped.set(roomId, [...(grouped.get(roomId) || []), entry]);
    });

    grouped.forEach((entries, roomId) => {
      const laneEnds = [];
      entries
        .sort((a, b) => a.start - b.start || a.end - b.end)
        .forEach((entry) => {
          const laneIndex = laneEnds.findIndex((end) => end <= entry.start);
          const index = laneIndex === -1 ? laneEnds.length : laneIndex;
          laneEnds[index] = entry.end;
          entry.lane = index + 1;
        });
      grouped.set(roomId, entries);
    });
    return grouped;
  }, [occupancy, viewStart]);

  if (roomsLoading || occupancyLoading) return <PageLoader />;

  return (
    <div className="employee-page occupancy-page">
      <div className="page-card">
        <div className="occupancy-toolbar">
          <div>
            <h2>Shaxmatka</h2>
            {/* <p>Xonalarning kunlar bo‘yicha bandligi va bo‘shligi.</p> */}
          </div>
          <div className="occupancy-actions">
            <Select
              allowClear
              className="occupancy-korpus-select"
              placeholder="Barcha korpuslar"
              value={korpus}
              options={korpusOptions}
              onChange={setKorpus}
            />
            <Select
              allowClear
              className="occupancy-floor-select"
              placeholder="Barcha qavatlar"
              value={floor}
              options={floorOptions}
              onChange={setFloor}
            />
            <Button icon={<FiChevronLeft />} onClick={() => setViewStart((date) => addDays(date, -DAY_COUNT))}>
              Oldingi
            </Button>
            <Button icon={<FiCalendar />} onClick={() => setViewStart(startOfDay(new Date()))}>
              Bugun
            </Button>
            <Button icon={<FiChevronRight />} iconPosition="end" onClick={() => setViewStart((date) => addDays(date, DAY_COUNT))}>
              Keyingi
            </Button>
          </div>
        </div>

        <div className="occupancy-legend" aria-label="Holatlar izohi">
          <span><i className="occupancy-dot occupancy-dot-active" /> Hozir yashayapti</span>
          <span><i className="occupancy-dot occupancy-dot-booked" /> Bron qilingan</span>
          <span><i className="occupancy-dot occupancy-dot-free" /> Bo‘sh</span>
          <span><i className="occupancy-dot occupancy-dot-repair" /> Remont</span>
        </div>

        <div className={`occupancy-scroll ${isFetching ? "is-refreshing" : ""}`}>
          <div className="occupancy-grid" style={{ "--day-count": DAY_COUNT }}>
            <div className="occupancy-header">
              <div className="occupancy-room-head">Xona</div>
              {days.map((day) => (
                <div className={`occupancy-day-head ${dateKey(day) === dateKey(new Date()) ? "is-today" : ""}`} key={dateKey(day)}>
                  <strong>{day.getDate()}</strong>
                  <span>{day.toLocaleDateString("uz-UZ", { weekday: "short" })}</span>
                </div>
              ))}
            </div>

            {visibleRooms.map((room) => {
              const entries = entriesByRoom.get(room._id) || [];
              const lanes = Math.max(1, ...entries.map((entry) => entry.lane));
              const isRepair = room.status === "remont";
              return (
                <div className="occupancy-room-row" key={room._id}>
                  <div className="occupancy-room-label">
                    <strong>{room.roomNumber}</strong>
                    <span>
                      {room.korpus ? `${room.korpus} korpus · ` : ""}
                      {room.floor}-qavat · {categoryLabels[room.category] || room.category || "-"}
                    </span>
                  </div>
                  <div
                    className={`occupancy-room-timeline ${isRepair ? "is-repair" : ""}`}
                    style={{ "--lanes": lanes }}
                  >
                    {days.map((day) => <div className={`occupancy-cell ${dateKey(day) === dateKey(new Date()) ? "is-today" : ""}`} key={dateKey(day)} />)}
                    {isRepair ? <div className="repair-label">Remont</div> : null}
                    {entries.map((entry) => {
                      const name = `${entry.firstname || ""} ${entry.lastname || ""}`.trim() || "Mehmon";
                      const left = entry.start * CELL_WIDTH;
                      const width = Math.max((entry.end - entry.start) * CELL_WIDTH, 10);
                      return (
                        <button
                          type="button"
                          key={entry._id}
                          className={`occupancy-booking occupancy-booking-${entry.status}`}
                          style={{
                            left: `${left}px`,
                            width: `${width}px`,
                            top: `${(entry.lane - 1) * ROW_HEIGHT}px`,
                          }}
                          title={`${name}: ${formatDate(entry.bookedForAt || entry.checkInAt)} — ${formatDate(entry.checkoutDueAt)}`}
                          onClick={() => setSelectedGuest(entry)}
                        >
                          <span>{name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!visibleRooms.length ? <div className="occupancy-empty">Ko‘rsatish uchun xona topilmadi.</div> : null}
      </div>

      <Modal title="Bron ma’lumotlari" open={Boolean(selectedGuest)} footer={null} onCancel={() => setSelectedGuest(null)}>
        {selectedGuest ? (
          <div className="occupancy-detail">
            <div><span>Mijoz</span><strong>{selectedGuest.firstname} {selectedGuest.lastname}</strong></div>
            <div><span>Xona</span><strong>{formatRoomLabel(selectedGuest.room)}</strong></div>
            <div><span>Kelish</span><strong>{formatDate(selectedGuest.bookedForAt || selectedGuest.checkInAt)}</strong></div>
            <div><span>Chiqish</span><strong>{formatDate(selectedGuest.checkoutDueAt)}</strong></div>
            <div><span>Holati</span><strong>{selectedGuest.status === "booked" ? "Bron qilingan" : "Hozir yashayapti"}</strong></div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default OccupancyPage;
