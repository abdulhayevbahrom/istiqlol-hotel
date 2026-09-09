import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiLogIn, FiShieldOff } from "react-icons/fi";
import { logout } from "../store/authSlice";

function ForbiddenPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const goToLogin = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
    <div className="access-denied-page">
      <section className="access-denied-panel" aria-labelledby="access-title">
        <div className="access-denied-visual" aria-hidden="true">
          <FiShieldOff size={42} />
        </div>
        <div className="access-denied-copy">
          <span className="access-denied-kicker">403</span>
          <h2 id="access-title">Ruxsat yo'q</h2>
          <p>
            Bu bo'lim sizga biriktirilmagan. Kerak bo'lsa administrator
            ruxsatlarni yangilab beradi.
          </p>
          <div className="access-denied-actions">
            <button
              className="access-denied-action primary"
              type="button"
              onClick={goToLogin}
            >
              <FiLogIn size={18} />
              <span>Login sahifasiga qaytish</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ForbiddenPage;
