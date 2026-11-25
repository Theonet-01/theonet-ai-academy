/* TheoNet Academy Supabase integration.
   Handles authentication, profile roles, course records and dashboards.
   Database access must remain protected by Supabase RLS policies.
*/

(() => {
  const configured =
    window.supabase &&
    window.THEONET_SUPABASE_URL &&
    !window.THEONET_SUPABASE_URL.includes("PASTE_") &&
    window.THEONET_SUPABASE_ANON_KEY &&
    !window.THEONET_SUPABASE_ANON_KEY.includes("PASTE_");

  window.theonet = {
    client: null,
    user: null,
    profile: null,
    configured
  };

  if (!configured) {
    console.warn(
      "TheoNet: Check your Supabase URL and publishable/anon key in supabase-config.js."
    );
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
    } else if (typeof window.showToast === "function") {
      window.showToast(message);
    }
  };

  let authMode = "login";
  let lastRoutedUserId = null;

  // Open the appropriate dashboard after the user's role is loaded.
  function openDashboardForRole(profile, user) {
    if (!profile || !user) return;

    // Prevent duplicate automatic navigation for the same login.
    if (lastRoutedUserId === user.id) return;

    const isAdmin = profile.role === "admin";

    const dashboardLink = isAdmin
      ? $("adminNav") || document.querySelector('[data-page="admin"]')
      : $("studentNav") || document.querySelector('[data-page="student"]');

    if (!dashboardLink) {
      console.error(
        "TheoNet: Dashboard navigation link was not found. Check adminNav/studentNav in index.html."
      );
      return;
    }

    // Mark this user as routed before triggering the navigation event.
    lastRoutedUserId = user.id;

    // script.js handles this click and opens the dashboard page.
    dashboardLink.click();
  }

  function openAuth(mode = "login") {
    authMode = mode;

    if ($("authBackdrop")) $("authBackdrop").hidden = false;
    if ($("authMessage")) $("authMessage").textContent = "";

    if ($("authTitle")) {
      $("authTitle").textContent =
        mode === "login" ? "Welcome back" : "Create your student account";
    }

    if ($("authDescription")) {
      $("authDescription").textContent =
        mode === "login"
          ? "Sign in to access your learning dashboard."
          : "Register to enrol in courses and track your progress.";
    }

    if ($("authName")) {
      $("authName").hidden = mode === "login";
      $("authName").required = mode === "register";
    }

    if ($("authNameLabel")) {
      $("authNameLabel").hidden = mode === "login";
    }

    if ($("authPassword")) {
      $("authPassword").autocomplete =
        mode === "login" ? "current-password" : "new-password";
    }

    if ($("authSubmit")) {
      $("authSubmit").textContent =
        mode === "login" ? "Sign in" : "Create account";
    }

    $("loginTab")?.classList.toggle("active", mode === "login");
    $("registerTab")?.classList.toggle("active", mode === "register");

    if ($("resetPassword")) {
      $("resetPassword").hidden = mode !== "login";
    }
  }

  // Load the signed-in user's profile and then update the website.
  async function loadProfile(user, shouldOpenDashboard = true) {
    const { data, error } = await client
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    window.theonet.user = user;
    window.theonet.profile = data;

    updateAccountUI();

    if (shouldOpenDashboard) {
      openDashboardForRole(data, user);
    }

    return data;
  }

  function updateAccountUI() {
    const profile = window.theonet.profile;
    const user = window.theonet.user;
    const signedIn = !!user;

    if ($("accountBtn")) {
      $("accountBtn").textContent = signedIn
        ? `${profile?.full_name || user.email} · Sign out`
        : "Sign in / Create account";
    }

    if ($("studentNav")) {
      $("studentNav").hidden = !signedIn;
    }

    if ($("accountNavLabel")) {
      $("accountNavLabel").hidden = !signedIn;
    }

    if ($("adminNav")) {
      $("adminNav").hidden = !(
        signedIn && profile?.role === "admin"
      );
    }
  }

  // STUDENT DASHBOARD
  async function refreshStudentDashboard() {
    const { data, error } = await client
      .from("enrollments")
      .select("id,status,created_at,courses(title)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if ($("studentStats")) {
      $("studentStats").innerHTML = `
        <div class="stat-card">
          <strong>${data.length}</strong>
          <span>My enrolments</span>
        </div>
        <div class="stat-card">
          <strong>${data.filter(x => x.status === "active").length}</strong>
          <span>Active courses</span>
        </div>
        <div class="stat-card">
          <strong>—</strong>
          <span>Certificates issued</span>
        </div>
      `;
    }

    if ($("studentEnrollments")) {
      $("studentEnrollments").innerHTML = data.length
        ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(x => `
                <tr>
                  <td>${escapeHtml(x.courses?.title || "Course")}</td>
                  <td>${escapeHtml(x.status)}</td>
                  <td>${new Date(x.created_at).toLocaleDateString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        `
        : "You have no enrolments yet.";
    }
  }

  // ADMINISTRATOR DASHBOARD
  async function refreshAdminDashboard() {
    if (window.theonet.profile?.role !== "admin") {
      throw new Error("Administrator access required.");
    }

    const [profiles, courses, enrollments] = await Promise.all([
      client
        .from("profiles")
        .select("id", { count: "exact", head: true }),

      client
        .from("courses")
        .select("id", { count: "exact", head: true }),

      client
        .from("enrollments")
        .select("id,status,created_at,student_id,courses(title)")
        .order("created_at", { ascending: false })
        .limit(30)
    ]);

    if (profiles.error) throw profiles.error;
    if (courses.error) throw courses.error;
    if (enrollments.error) throw enrollments.error;

    if ($("adminStats")) {
      $("adminStats").innerHTML = `
        <div class="stat-card">
          <strong>${profiles.count ?? 0}</strong>
          <span>Registered users</span>
        </div>
        <div class="stat-card">
          <strong>${courses.count ?? 0}</strong>
          <span>Courses</span>
        </div>
        <div class="stat-card">
          <strong>${enrollments.data.length}</strong>
          <span>Recent enrolments</span>
        </div>
      `;
    }

    await renderAdminCourses();

    if ($("adminEnrollments")) {
      $("adminEnrollments").innerHTML = enrollments.data.length
        ? `
          <table class="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${enrollments.data.map(x => `
                <tr>
                  <td>${escapeHtml(String(x.student_id || "").slice(0, 8))}…</td>
                  <td>${escapeHtml(x.courses?.title || "Course")}</td>
                  <td>${escapeHtml(x.status)}</td>
                  <td>${new Date(x.created_at).toLocaleDateString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        `
        : "No enrolments recorded yet.";
    }
  }

  async function renderAdminCourses() {
    const { data, error } = await client
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!$("adminCourses")) return;

    $("adminCourses").innerHTML = data.length
      ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Price</th>
              <th>Published</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(c => `
              <tr>
                <td>${escapeHtml(c.title)}</td>
                <td>₦${Number(c.price_ngn).toLocaleString("en-NG")}</td>
                <td>${c.is_published ? "Yes" : "No"}</td>
                <td>
                  <button class="outline-btn" data-delete-course="${c.id}">
                    Delete
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `
      : "No courses have been added yet.";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[ch]);
  }

  // ACCOUNT BUTTON / SIGN OUT
  $("accountBtn")?.addEventListener("click", async () => {
    if (!window.theonet.user) {
      return openAuth("login");
    }

    if (!confirm("Sign out of TheoNet Academy?")) return;

    const { error } = await client.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    window.theonet.user = null;
    window.theonet.profile = null;
    lastRoutedUserId = null;

    updateAccountUI();
    location.reload();
  });

  $("authClose")?.addEventListener("click", () => {
    if ($("authBackdrop")) $("authBackdrop").hidden = true;
  });

  $("authBackdrop")?.addEventListener("click", e => {
    if (e.target === $("authBackdrop")) {
      $("authBackdrop").hidden = true;
    }
  });

  $("loginTab")?.addEventListener("click", () => openAuth("login"));
  $("registerTab")?.addEventListener("click", () => openAuth("register"));

  // LOGIN AND REGISTRATION
  $("authForm")?.addEventListener("submit", async e => {
    e.preventDefault();

    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    const name = $("authName")?.value.trim() || "";

    $("authSubmit").disabled = true;

    try {
      if (authMode === "register") {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name }
          }
        });

        if (error) throw error;

        say(
          data.session
            ? "Account created. You can now access your student dashboard."
            : "Registration received. Check your email to confirm your account, then sign in."
        );

      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        if (!data.user) {
          throw new Error("Login succeeded, but the user account could not be retrieved.");
        }

        // Load the role before attempting dashboard navigation.
        const profile = await loadProfile(data.user, false);

        $("authBackdrop").hidden = true;

        // Open the administrator or student dashboard automatically.
        openDashboardForRole(profile, data.user);
      }

    } catch (err) {
      console.error("TheoNet authentication error:", err);
      say(err.message || "Authentication failed.", true);

    } finally {
      $("authSubmit").disabled = false;
    }
  });

  // PASSWORD RESET
  $("resetPassword")?.addEventListener("click", async () => {
    const email = $("authEmail").value.trim();

    if (!email) {
      return say("Enter your email address first.", true);
    }

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin
      });

      if (error) throw error;

      say("Password reset instructions have been sent if the account exists.");

    } catch (err) {
      say(err.message, true);
    }
  });

  // ADD COURSE
  $("courseForm")?.addEventListener("submit", async e => {
    e.preventDefault();

    try {
      if (window.theonet.profile?.role !== "admin") {
        throw new Error("Administrator access required.");
      }

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

    } catch (err) {
      alert(err.message || "Could not save course.");
    }
  });

  // DELETE COURSE
  document.addEventListener("click", async e => {
    const button = e.target.closest("[data-delete-course]");
    const id = button?.dataset?.deleteCourse;

    if (!id) return;

    if (window.theonet.profile?.role !== "admin") {
      alert("Administrator access required.");
      return;
    }

    if (!confirm("Delete this course? Existing enrolment records may prevent deletion.")) {
      return;
    }

    const { error } = await client
      .from("courses")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      await renderAdminCourses();
    }
  });

  // LISTEN FOR DASHBOARD NAVIGATION FROM script.js
  window.addEventListener("theonet:navigate", async e => {
    try {
      if (e.detail === "student") {
        await refreshStudentDashboard();
      }

      if (e.detail === "admin") {
        await refreshAdminDashboard();
      }

    } catch (err) {
      console.error("TheoNet dashboard error:", err);
      alert(err.message || "Unable to load dashboard.");
    }
  });

  // AUTHENTICATION STATE CHANGES
  // Defer Supabase queries until the auth callback has returned.
  client.auth.onAuthStateChange((_event, session) => {
    Promise.resolve().then(async () => {
      if (!session?.user) {
        window.theonet.user = null;
        window.theonet.profile = null;
        lastRoutedUserId = null;
        updateAccountUI();
        return;
      }

      try {
        await loadProfile(session.user, true);
      } catch (err) {
        console.error("Could not load TheoNet profile:", err);
      }
    });
  });

  // RESTORE AN EXISTING LOGIN SESSION WHEN THE WEBSITE OPENS
  client.auth.getSession().then(async ({ data, error }) => {
    if (error) {
      console.error("Could not restore TheoNet session:", error);
      updateAccountUI();
      return;
    }

    if (data.session?.user) {
      try {
        await loadProfile(data.session.user, true);
      } catch (err) {
        console.error("Could not restore TheoNet profile:", err);
      }
    } else {
      updateAccountUI();
    }
  });

})();
