import { Link } from "react-router-dom";

function ForbiddenPage() {
  return (
    <div className="page-card">
      <h2>Ruxsat yo'q</h2>
      <p>Bu bo'limga o'tish uchun sizda huquq mavjud emas.</p>
      <Link className="text-link" to="/dashboard">
        Dashboardga qaytish
      </Link>
    </div>
  );
}

export default ForbiddenPage;
