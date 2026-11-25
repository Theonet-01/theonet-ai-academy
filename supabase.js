/* TheoNet Academy Supabase integration.
   This file handles student authentication, profile roles, course records and dashboards.
   Authorization is enforced by Supabase RLS policies in schema.sql, not by UI visibility.
*/
(() => {
  const configured = window.supabase &&
    window.THEONET_SUPABASE_URL &&
    !window.THEONET_SUPABASE_URL.includes("PASTE_") &&
    window.THEONET_SUPABASE_ANON_KEY &&
    !window.THEONET_SUPABASE_ANON_KEY.includes("PASTE_");

  window.theonet = { client: null, user: null, profile: null, configured };

  if (!configured) {
    console.warn("TheoNet: add your Supabase URL and publishable/anon key in supabase-config.js.");
    return;
  }

  const client = window.supabase.createClient(
    window.THEONET_SUPABASE_URL,
    window.THEONET_SUPABASE_ANON_KEY
  );
  window.theonet.client = client;

  const $ = (id) => document.getElementById(id);
  const say = (message, error = false) => {
    const node = $("authMessage");
    if (node) {
      node.textContent = message;
      node.style.color = error ? "#dc2626" : "var(--green)";
    } else if (typeof window.showToast === "function") window.showToast(message);
  };

  let authMode = "login";
  function openAuth(mode = "login") {
    authMode = mode;
    $("authBackdrop").hidden = false;
    $("authMessage").textContent = "";
    $("authTitle").textContent = mode === "login" ? "Welcome back" : "Create your student account";
    $("authDescription").textContent = mode === "login"
      ? "Sign in to access your learning dashboard."
      : "Register to enrol in courses and track your progress.";
    $("authName").hidden = mode === "login";
    $("authNameLabel").hidden = mode === "login";
    $("authName").required = mode === "register";
    $("authPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
    $("authSubmit").textContent = mode === "login" ? "Sign in" : "Create account";
    $("loginTab").classList.toggle("active", mode === "login");
    $("registerTab").classList.toggle("active", mode === "register");
    $("resetPassword").hidden = mode !== "login";
  }

  async function loadProfile(user) {
    const { data, error } = await client.from("profiles")
      .select("id, full_name, role").eq("id", user.id).single();
    if (error) throw error;
    window.theonet.user = user;
    window.theonet.profile = data;
    updateAccountUI();
    return data;
  }

  function updateAccountUI() {
    const profile = window.theonet.profile;
    const signedIn = !!window.theonet.user;
    $("accountBtn").textContent = signedIn
      ? `${profile?.full_name || window.theonet.user.email} · Sign out`
      : "Sign in / Create account";
    $("studentNav").hidden = !signedIn;
    $("accountNavLabel").hidden = !signedIn;
    $("adminNav").hidden = !(signedIn && profile?.role === "admin");
  }

  async function refreshStudentDashboard() {
    const { data, error } = await client.from("enrollments")
      .select("id,status,created_at,courses(title)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    $("studentStats").innerHTML = `
      <div class="stat-card"><strong>${data.length}</strong><span>My enrolments</span></div>
      <div class="stat-card"><strong>${data.filter(x => x.status === "active").length}</strong><span>Active courses</span></div>
      <div class="stat-card"><strong>—</strong><span>Certificates issued</span></div>`;
    $("studentEnrollments").innerHTML = data.length ? `
      <table class="data-table"><thead><tr><th>Course</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${data.map(x => `<tr><td>${escapeHtml(x.courses?.title || "Course")}</td><td>${escapeHtml(x.status)}</td><td>${new Date(x.created_at).toLocaleDateString()}</td></tr>`).join("")}</tbody></table>`
      : "You have no enrolments yet.";
  }

  async function refreshAdminDashboard() {
    if (window.theonet.profile?.role !== "admin") throw new Error("Administrator access required.");
    const [profiles, courses, enrollments] = await Promise.all([
      client.from("profiles").select("id", { count: "exact", head: true }),
      client.from("courses").select("id", { count: "exact", head: true }),
      client.from("enrollments").select("id,status,created_at,student_id,courses(title)").order("created_at", { ascending: false }).limit(30)
    ]);
    if (profiles.error) throw profiles.error;
    if (courses.error) throw courses.error;
    if (enrollments.error) throw enrollments.error;
    $("adminStats").innerHTML = `
      <div class="stat-card"><strong>${profiles.count ?? 0}</strong><span>Registered users</span></div>
      <div class="stat-card"><strong>${courses.count ?? 0}</strong><span>Courses</span></div>
      <div class="stat-card"><strong>${enrollments.data.length}</strong><span>Recent enrolments</span></div>`;
    await renderAdminCourses();
    $("adminEnrollments").innerHTML = enrollments.data.length ? `
      <table class="data-table"><thead><tr><th>Student</th><th>Course</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${enrollments.data.map(x => `<tr><td>${escapeHtml(x.student_id.slice(0, 8))}…</td><td>${escapeHtml(x.courses?.title || "Course")}</td><td>${escapeHtml(x.status)}</td><td>${new Date(x.created_at).toLocaleDateString()}</td></tr>`).join("")}</tbody></table>`
      : "No enrolments recorded yet.";
  }

  async function renderAdminCourses() {
    const { data, error } = await client.from("courses").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    $("adminCourses").innerHTML = data.length ? `
      <table class="data-table"><thead><tr><th>Course</th><th>Price</th><th>Published</th><th>Action</th></tr></thead>
      <tbody>${data.map(c => `<tr><td>${escapeHtml(c.title)}</td><td>₦${Number(c.price_ngn).toLocaleString("en-NG")}</td><td>${c.is_published ? "Yes" : "No"}</td><td><button class="outline-btn" data-delete-course="${c.id}">Delete</button></td></tr>`).join("")}</tbody></table>`
      : "No courses have been added yet.";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    })[ch]);
  }

  $("accountBtn")?.addEventListener("click", async () => {
    if (!window.theonet.user) return openAuth("login");
    if (!confirm("Sign out of TheoNet Academy?")) return;
    await client.auth.signOut();
    window.theonet.user = null; window.theonet.profile = null;
    updateAccountUI(); location.reload();
  });
  $("authClose")?.addEventListener("click", () => $("authBackdrop").hidden = true);
  $("authBackdrop")?.addEventListener("click", e => {
    if (e.target === $("authBackdrop")) $("authBackdrop").hidden = true;
  });
  $("loginTab")?.addEventListener("click", () => openAuth("login"));
  $("registerTab")?.addEventListener("click", () => openAuth("register"));

  $("authForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    const name = $("authName").value.trim();
    $("authSubmit").disabled = true;
    try {
      if (authMode === "register") {
        const { data, error } = await client.auth.signUp({
          email, password, options: { data: { full_name: name } }
        });
        if (error) throw error;
        say(data.session
          ? "Account created. You can now access your student dashboard."
          : "Registration received. Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        $("authBackdrop").hidden = true;
        location.reload();
      }
    } catch (err) { say(err.message || "Authentication failed.", true); }
    finally { $("authSubmit").disabled = false; }
  });

  $("resetPassword")?.addEventListener("click", async () => {
    const email = $("authEmail").value.trim();
    if (!email) return say("Enter your email address first.", true);
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin
      });
      if (error) throw error;
      say("Password reset instructions have been sent if the account exists.");
    } catch (err) { say(err.message, true); }
  });

  $("courseForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    try {
      const { error } = await client.from("courses").insert({
        title: $("courseTitle").value.trim(),
        price_ngn: Number($("coursePrice").value),
        image_url: $("courseImage").value.trim() || null,
        description: $("courseDescription").value.trim(),
        is_published: true
      });
      if (error) throw error;
      e.target.reset();
      await refreshAdminDashboard();
      alert("Course saved.");
    } catch (err) { alert(err.message || "Could not save course."); }
  });

  document.addEventListener("click", async e => {
    const id = e.target?.dataset?.deleteCourse;
    if (!id) return;
    if (!confirm("Delete this course? Existing enrolment records may prevent deletion.")) return;
    const { error } = await client.from("courses").delete().eq("id", id);
    if (error) alert(error.message);
    else await renderAdminCourses();
  });

  window.addEventListener("theonet:navigate", async e => {
    try {
      if (e.detail === "student") await refreshStudentDashboard();
      if (e.detail === "admin") await refreshAdminDashboard();
    } catch (err) { alert(err.message || "Unable to load dashboard."); }
  });

  client.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      window.theonet.user = null; window.theonet.profile = null; updateAccountUI(); return;
    }
    try { await loadProfile(session.user); }
    catch (err) { console.error("Could not load TheoNet profile:", err); }
  });

  client.auth.getSession().then(async ({ data }) => {
    if (data.session?.user) {
      try { await loadProfile(data.session.user); }
      catch (err) { console.error(err); }
    } else updateAccountUI();
  });
})();
