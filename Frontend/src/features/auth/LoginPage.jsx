import { useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import {
  Eye,
  EyeOff,
  Globe,
  Headphones,
  LoaderCircle,
  Mail,
  MessageCircle,
  Monitor,
  Phone,
  Store,
} from "lucide-react";
import { loginSuccess } from "./authSlice";
import { loginUser } from "../../services/authService";

const schema = Yup.object({
  username: Yup.string()
    .min(3, "Min 3 characters")
    .required("Username is required"),
  password: Yup.string().required("Password is required"),
});

const loginAnimationSrc = "/login.json";

const floatingIcons = [
  {
    Icon: MessageCircle,
    className: "left-14 top-14 h-20 w-20 rounded-[24px]",
  },
  {
    Icon: Headphones,
    className: "left-1/2 top-12 h-16 w-16 -translate-x-1/2 rounded-full",
  },
  {
    Icon: Globe,
    className: "left-12 top-1/3 h-16 w-16 rounded-full",
  },
  {
    Icon: Monitor,
    className: "right-20 top-28 h-20 w-20 rounded-[24px]",
  },
  {
    Icon: Phone,
    className: "right-12 top-1/2 h-16 w-16 rounded-full",
  },
  {
    Icon: Mail,
    className: "left-28 top-[54%] h-16 w-16 rounded-[20px]",
  },
];

function IllustrationPanel() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-[linear-gradient(160deg,#ceb8ff_0%,#b18fec_42%,#9f77e3_72%,#8d66d7_100%)] lg:flex lg:items-center lg:justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.52),transparent_18%),radial-gradient(circle_at_84%_24%,rgba(255,255,255,0.18),transparent_18%),radial-gradient(circle_at_70%_78%,rgba(76,29,149,0.18),transparent_22%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(91,60,151,0.45)_1.2px,transparent_1.2px)] [background-size:28px_28px]" />

      {floatingIcons.map(({ Icon, className }, index) => (
        <div
          key={index}
          className={`absolute flex items-center justify-center border border-[#7d5dc8]/35 bg-white/[0.08] text-[#7856c7]/70 ${className}`}
        >
          <Icon className="h-8 w-8" strokeWidth={1.5} />
        </div>
      ))}

      <div className="absolute right-20 top-1/2 flex -translate-y-1/2 gap-3">
        <span className="h-4 w-4 rounded-full border-2 border-white/80 bg-transparent" />
        <span className="h-4 w-4 rounded-full border-2 border-white/80 bg-white/90" />
        <span className="h-4 w-4 rounded-full border-2 border-white/80 bg-transparent" />
      </div>

      <div className="relative z-10 flex h-full w-full items-center justify-center px-6 py-8">
        <DotLottieReact
          src={loginAnimationSrc}
          loop
          autoplay
          className="h-[88vh] w-full max-w-[860px] scale-[1.04] drop-shadow-[0_20px_45px_rgba(76,29,149,0.18)]"
        />
      </div>
    </section>
  );
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);

  const formik = useFormik({
    initialValues: { username: "", password: "" },
    validationSchema: schema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const response = await loginUser(values);
        const authData = response.data.data;

        dispatch(loginSuccess(authData));
        toast.success("Login successful!");
        navigate("/pos");
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Invalid username or password",
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  const usernameError = formik.touched.username && formik.errors.username;
  const passwordError = formik.touched.password && formik.errors.password;

  return (
    <div className="min-h-screen bg-[#f4f2f8] lg:grid lg:grid-cols-2">
      <section className="flex min-h-screen bg-white">
        <div className="flex w-full flex-col px-7 py-8 sm:px-10 lg:px-14 xl:px-20">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#6b46ba] text-white shadow-lg shadow-[#6b46ba]/25">
              <Store className="h-7 w-7" />
            </div>
            <div className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl xl:text-5xl">
              RetailTouch POS
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-[430px]">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
                  Welcome back
                </h1>
                <p className="mt-3 text-lg text-slate-400">
                  Please enter your details
                </p>
              </div>

              <form onSubmit={formik.handleSubmit} className="mt-12 space-y-7">
                <div>
                  <label
                    htmlFor="username"
                    className="mb-3 block text-lg font-medium text-slate-900"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    className={`h-14 w-full rounded-xl border bg-white px-4 text-base text-slate-900 outline-none transition placeholder:text-slate-300 ${
                      usernameError
                        ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                        : "border-slate-200 focus:border-[#6b46ba] focus:ring-4 focus:ring-[#6b46ba]/10"
                    }`}
                    value={formik.values.username}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {usernameError ? (
                    <p className="mt-2 text-sm text-red-500">
                      {formik.errors.username}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-3 block text-lg font-medium text-slate-900"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPass ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      className={`h-14 w-full rounded-xl border bg-white px-4 pr-14 text-base text-slate-900 outline-none transition placeholder:text-slate-300 ${
                        passwordError
                          ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                          : "border-slate-200 focus:border-[#6b46ba] focus:ring-4 focus:ring-[#6b46ba]/10"
                      }`}
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      onClick={() => setShowPass(!showPass)}
                      aria-label={showPass ? "Hide password" : "Show password"}
                    >
                      {showPass ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {passwordError ? (
                    <p className="mt-2 text-sm text-red-500">
                      {formik.errors.password}
                    </p>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={formik.isSubmitting}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#6b46ba] px-4 text-lg font-semibold text-white transition hover:bg-[#5d3ca7] focus:outline-none focus:ring-4 focus:ring-[#6b46ba]/20 disabled:cursor-not-allowed disabled:bg-[#b39bd8]"
                >
                  {formik.isSubmitting ? (
                    <>
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <p className="mt-10 text-sm text-slate-400">
                (c) {new Date().getFullYear()} RetailTouch POS
              </p>
            </div>
          </div>
        </div>
      </section>

      <IllustrationPanel />
    </div>
  );
}
