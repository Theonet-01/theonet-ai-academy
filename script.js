
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

if ($("#year")) $("#year").textContent = new Date().getFullYear();

/* =========================================
   SERVICES
========================================= */

const services = [
  {
    id: "graphics",
    type: "service",
    title: "Graphics Design",
    price: null,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1790001462/Max_a_used_this_man_in_the.png",
    desc: "Hire TheoNet for visual assets, flyers, banners and design deliverables.",
    deliverable: "Service scope and quote confirmed before work begins."
  },
  {
    id: "web-creation",
    type: "service",
    title: "Website Creation",
    price: null,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1792162896/10.jpg",
    desc: "Hire TheoNet to design and build a responsive website.",
    deliverable: "Project scope, timeline and fee confirmed before the project begins."
  },
  {
    id: "ai-animation-service",
    type: "service",
    title: "AI Animation Service",
    price: null,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1792162895/6.jpg",
    desc: "Request AI-assisted animation and visual storytelling services.",
    deliverable: "Requirements and quotation confirmed before production."
  }
];

let courses = [];
let inventory = [...services];

const formatPrice = (amount) => new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0
}).format(amount);

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[ch]);

function courseItem(course) {
  return {
    id: course.id,
    type: "course",
    title: course.title,
    price: 5000,
    img: course.image_url || "https://res.cloudinary.com/hvncv4da/image/upload/v1789913646/main-sample.png",
    desc: course.description || "Practical, structured training from TheoNet AI Academy.",
    deliverable: "Individual course access — ₦5,000. Enrolment activates after server-side payment verification."
  };
}

/* =========================================
   CATALOGUE DISPLAY
========================================= */

function renderItemCard(item) {
  const isTBC = item.type === "service";

  const typeText = isTBC
    ? "Creative / Web Service"
    : "Training Course";

  const buttonText = isTBC
    ? "Request a Quote"
    : "Enroll Now";

  return `
    <article class="item-card">
      <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.title)}" class="item-image" loading="lazy">
      <div class="item-body">
        <span class="item-type">${typeText}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.desc)}</p>
        <div class="item-deliverable">${escapeHtml(item.deliverable)}</div>
        <div class="item-footer">
          <span class="item-price${isTBC ? " tbc" : ""}">
            ${isTBC ? "Request a quote" : formatPrice(item.price)}
          </span>
          <button class="outline-btn" type="button" onclick="goToCheckout('${escapeHtml(String(item.id))}')">
            ${buttonText}
          </button>
        </div>
      </div>
    </article>`;
}

function renderCatalog() {
  inventory = [...courses.map(courseItem), ...services];

  const dashboardItems = [
    ...courses.slice(0, 2).map(courseItem),
    services[0]
  ].filter(Boolean);

  if ($("#dashboardItems")) {
    $("#dashboardItems").innerHTML = dashboardItems.map(renderItemCard).join("")
      || '<p class="muted">Courses will appear here when published.</p>';
  }

  renderCourseSearch();

  if ($("#allServicesGrid")) {
    $("#allServicesGrid").innerHTML = services.map(renderItemCard).join("");
  }

  const select = $("#checkoutItemSelect");

  if (select) {
    const previousSelection = select.value;

    select.innerHTML =
      '<option value="">Select a course or service</option>' +
      inventory.map(item =>
        `<option value="${escapeHtml(String(item.id))}">
          ${escapeHtml(item.title)} — ${item.type === "service" ? "Quote required" : formatPrice(item.price)}
        </option>`
      ).join("");

    const selectionStillExists = inventory.some(
      item => String(item.id) === previousSelection
    );

    select.value = selectionStillExists ? previousSelection : "";

    updateCheckoutUI();
  }
}

function renderCourseSearch() {
  const query = ($("#courseSearchInput")?.value || "").trim().toLowerCase();

  const filtered = courses.map(courseItem).filter(item =>
    `${item.title} ${item.desc}`.toLowerCase().includes(query)
  );

  if ($("#allCoursesGrid")) {
    $("#allCoursesGrid").innerHTML = filtered.length
      ? filtered.map(renderItemCard).join("")
      : '<p class="muted">No courses match your search.</p>';
  }
}

/* =========================================
   LOAD PUBLISHED COURSES
========================================= */

async function loadPublicCourses() {
  const client = window.theonet?.client;

  if (!client) {
    if ($("#allCoursesGrid")) {
      $("#allCoursesGrid").innerHTML =
        '<p class="muted">Course catalogue is temporarily unavailable. Please refresh the page.</p>';
    }
    return;
  }

  const { data, error } = await client
    .from("courses")
    .select("id,title,description,price_ngn,image_url")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load public courses:", error);

    if ($("#allCoursesGrid")) {
      $("#allCoursesGrid").innerHTML =
        '<p class="muted">Unable to load courses right now. Please try again.</p>';
    }
    return;
  }

  courses = data || [];
  renderCatalog();
}

renderCatalog();

$("#courseSearchInput")?.addEventListener("input", renderCourseSearch);

window.addEventListener("theonet:ready", loadPublicCourses);

if (window.theonet?.client) {
  loadPublicCourses();
}

/* =========================================
   WEBSITE NAVIGATION
========================================= */

function navigate(page) {
  const target = $(`#page-${page}`);

  if (!target) return;

  $$(".page").forEach(section => section.classList.remove("active"));
  target.classList.add("active");

  $$(".nav-link").forEach(link =>
    link.classList.toggle("active", link.dataset.page === page)
  );

  const pageTitles = {
    dashboard: "Overview",
    courses: "Courses",
    services: "Hire Services",
    enrollment: "Checkout & Payment",
    image: "Image Prompt Builder",
    video: "Video Outline Builder",
    prompts: "Prompt Builder",
    student: "Student Dashboard",
    admin: "Admin Dashboard"
  };

  if ($("#breadcrumb")) {
    $("#breadcrumb").textContent = pageTitles[page] || "Overview";
  }

  $("#sidebar")?.classList.remove("open");
  $("#mobileOverlay")?.classList.remove("show");

  window.scrollTo({ top: 0, behavior: "smooth" });

  window.dispatchEvent(
    new CustomEvent("theonet:navigate", { detail: page })
  );
}

document.addEventListener("click", event => {
  const pageButton = event.target.closest("[data-page]");

  if (!pageButton) return;

  event.preventDefault();

  const requestedPage = pageButton.dataset.page;

  if (requestedPage === "student" && !window.theonet?.user) {
    $("#accountBtn")?.click();
    return;
  }

  if (
    requestedPage === "admin" &&
    window.theonet?.profile?.role !== "admin"
  ) {
    showToast("Administrator access is required.");
    return;
  }

  navigate(requestedPage);
});

$("#menuBtn")?.addEventListener("click", () => {
  $("#sidebar")?.classList.toggle("open");
  $("#mobileOverlay")?.classList.toggle("show");
});

$("#mobileOverlay")?.addEventListener("click", () => {
  $("#sidebar")?.classList.remove("open");
  $("#mobileOverlay")?.classList.remove("show");
});

/* =========================================
   CHECKOUT
========================================= */

window.goToCheckout = function(itemId) {
  navigate("enrollment");

  const select = $("#checkoutItemSelect");

  if (select) {
    select.value = String(itemId);
    updateCheckoutUI();
  }
};

$("#checkoutItemSelect")?.addEventListener("change", updateCheckoutUI);

function updateCheckoutUI() {
  const select = $("#checkoutItemSelect");

  if (!select) return;

  const item = inventory.find(x => String(x.id) === select.value);

  if (!item) {
    $("#summaryTitle").textContent = "No item selected";
    $("#summaryDesc").textContent = "Select an individual course to continue with enrollment.";
    $("#summaryDeliverable").textContent = "Each published course costs ₦5,000.";
    $("#summaryPrice").textContent = "₦5,000 per course";
    $("#payAmountDisplay").textContent = "Select a course";
    $("#payAmountDisplay").style.color = "var(--red)";
    $("#paystackPayBtn").disabled = true;
    $("#paystackPayBtn").textContent = "Select a Course First";

    if ($("#tbcWarning")) {
      $("#tbcWarning").hidden = true;
    }
    return;
  }

  $("#summaryTitle").textContent = item.title;
  $("#summaryDesc").textContent = item.desc;
  $("#summaryDeliverable").textContent = item.deliverable;

  const isService = item.type === "service";
  const amount = isService ? "Quote required" : formatPrice(5000);

  $("#summaryPrice").textContent = amount;
  $("#payAmountDisplay").textContent = amount;

  $("#payAmountDisplay").style.color = isService
    ? "var(--red)"
    : "var(--green)";

  $("#paystackPayBtn").disabled = isService || item.type !== "course";

  $("#paystackPayBtn").textContent = isService
    ? "Contact TheoNet for a Quote"
    : "Continue to Paystack";

  if ($("#tbcWarning")) {
    $("#tbcWarning").hidden = !isService;
  }
}

/* =========================================
   PAYSTACK PAYMENT INITIALIZATION
========================================= */

$("#paystackPayBtn")?.addEventListener("click", async () => {
  const client = window.theonet?.client;
  const user = window.theonet?.user;

  if (!client) {
    return showToast("Payment service is not configured. Please contact support.");
  }

  if (!user) {
    showToast("Please sign in before making payment.");
    $("#accountBtn")?.click();
    return;
  }

  const item = inventory.find(
    x => String(x.id) === $("#checkoutItemSelect")?.value
  );

  if (!item) {
    return showToast("Please select a published course first.");
  }

  if (item.type === "service") {
    return showToast("Please contact TheoNet for a service quotation.");
  }

  if (item.type !== "course") {
    return showToast("Only individual course payments are supported.");
  }

  const button = $("#paystackPayBtn");
  const status = $("#paymentStatus");

  button.disabled = true;
  button.textContent = "Connecting to Paystack...";

  if (status) {
    status.textContent = "Preparing secure checkout...";
  }

  try {
    const body = {
      item_type: "course",
      course_id: item.id
    };

    const { data, error } = await client.functions.invoke(
      "initialize-paystack-payment",
      { body }
    );

    if (error) throw error;

    if (
      !data?.payment_id ||
      !data?.reference ||
      !data?.authorization_url
    ) {
      throw new Error(
        data?.error || "Paystack did not return complete payment details."
      );
    }

    sessionStorage.setItem(
      "theonet_payment_id",
      data.payment_id
    );

    sessionStorage.setItem(
      "theonet_payment_reference",
      data.reference
    );

    if (status) {
      status.textContent = "Redirecting to secure Paystack checkout...";
    }

    window.location.assign(data.authorization_url);

  } catch (err) {
    console.error("Paystack initialization failed:", err);

    const message = err.message ||
      "Unable to start payment. Please try again.";

    if (status) status.textContent = message;

    showToast(message);

    button.disabled = false;
    button.textContent = "Continue to Paystack";
  }
});

/* =========================================
   PAYSTACK PAYMENT VERIFICATION
========================================= */

let paymentVerificationInProgress = false;
let lastVerificationAttempt = "";

function cleanPaymentReturnUrl() {
  const params = new URLSearchParams(window.location.search);

  params.delete("reference");
  params.delete("trxref");

  const cleanUrl =
    `${window.location.pathname}` +
    `${params.toString() ? `?${params}` : ""}` +
    `${window.location.hash}`;

  window.history.replaceState({}, document.title, cleanUrl);
}

async function verifyPaystackReturn() {
  const params = new URLSearchParams(window.location.search);

  const reference =
    params.get("reference") ||
    params.get("trxref") ||
    sessionStorage.getItem("theonet_payment_reference");

  const paymentId = sessionStorage.getItem("theonet_payment_id");

  if (!reference) return;

  const statusNode = $("#paymentStatus");

  const client = window.theonet?.client;
  const user = window.theonet?.user;

  if (!client || !user) {
    if (statusNode) {
      statusNode.textContent =
        "Payment returned. Please sign in with the same account used to make the payment. Your payment details have been retained.";
    }
    return;
  }

  if (!paymentId) {
    if (statusNode) {
      statusNode.textContent =
        "The payment ID is missing from this browser session. Please contact TheoNet support before attempting another payment.";
    }
    return;
  }

  if (paymentVerificationInProgress) return;

  if (lastVerificationAttempt === reference) return;

  paymentVerificationInProgress = true;
  lastVerificationAttempt = reference;

  if (statusNode) {
    statusNode.textContent =
      "Verifying your Paystack payment securely...";
  }

  try {
    const { data, error } = await client.functions.invoke(
      "verify-paystack-payment",
      {
        body: {
          reference: reference,
          payment_id: paymentId
        }
      }
    );

    if (error) throw error;

    if (!data?.success) {
      throw new Error(
        data?.error ||
        data?.message ||
        "Payment could not be verified."
      );
    }

    sessionStorage.removeItem("theonet_payment_id");
    sessionStorage.removeItem("theonet_payment_reference");

    if (statusNode) {
      statusNode.textContent =
        "Payment verified successfully. Your course access has been activated.";
    }

    cleanPaymentReturnUrl();

    showToast(
      "Payment successful. Your course access has been activated."
    );

    navigate("student");

  } catch (err) {
    console.error("Paystack verification failed:", err);

    const message = err.message ||
      "Payment verification is pending. Please contact support if the amount was debited.";

    if (statusNode) {
      statusNode.textContent = message;
    }

    showToast(message);

    // Keep the payment reference and ID so verification can be retried.
    lastVerificationAttempt = "";

  } finally {
    paymentVerificationInProgress = false;
  }
}

window.addEventListener("theonet:ready", verifyPaystackReturn);

if (window.theonet?.client && window.theonet?.user) {
  verifyPaystackReturn();
}

/* =========================================
   OTHER WEBSITE FEATURES
========================================= */

window.copyText = async function(elementId) {
  const text = $(`#${elementId}`)?.textContent || "";

  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard.");
  } catch {
    showToast("Unable to copy automatically. Select and copy manually.");
  }
};

$("#generateImagePrompt")?.addEventListener("click", () => {
  const idea = $("#imageIdea").value.trim();

  if (!idea) {
    return showToast("Enter an image idea first.");
  }

  const style = $("#imageStyle").value;

  $("#imagePromptResult").textContent =
    `Style: ${style}\nSubject: ${idea}\nComposition: Clear focal subject, balanced framing, controlled lighting.`;
});

$("#generateVideoScript")?.addEventListener("click", () => {
  const idea = $("#videoIdea").value.trim();

  if (!idea) {
    return showToast("Enter a video topic first.");
  }

  $("#videoResult").textContent =
    `Topic: ${idea}\n\n1. Hook: Introduce the topic clearly.\n2. Core Walkthrough: Show practical steps.\n3. Wrap-up: Summarize key takeaway.`;
});

$("#buildPrompt")?.addEventListener("click", () => {
  const idea = $("#promptIdea").value.trim();

  if (!idea) {
    return showToast("Enter a task or context first.");
  }

  $("#promptResult").textContent =
    `Task & Context:\n${idea}\n\nOutput Rules:\n- Be clear, structured, and direct.\n- State assumptions when information is missing.`;
});

/* =========================================
   NOTIFICATION MESSAGE
========================================= */

let toastTimer;

function showToast(message) {
  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(
    () => toast.classList.remove("show"),
    3200
  );
}
