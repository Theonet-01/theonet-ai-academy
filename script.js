const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

if ($("#year")) $("#year").textContent = new Date().getFullYear();

const bundle = {
  id: "bundle", type: "package", title: "THEONET ACADEMY COMPLETE PACKAGE", price: 50000,
  img: "https://res.cloudinary.com/hvncv4da/image/upload/v1792162894/1.jpg",
  desc: "Full access to the published academy courses and structured training resources.",
  deliverable: "Includes published academy courses and learning materials. Excludes custom agency work and website builds."
};

const services = [
  { id: "graphics", type: "service", title: "Graphics Design", price: null,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1790001462/Max_a_used_this_man_in_the.png",
    desc: "Hire TheoNet for visual assets, flyers, banners and design deliverables.", deliverable: "Service scope and quote confirmed before work begins." },
  { id: "web-creation", type: "service", title: "Website Creation", price: null,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1792162896/10.jpg",
    desc: "Hire TheoNet to design and build a responsive website.", deliverable: "Project scope, timeline and fee confirmed before the project begins." },
  { id: "ai-animation-service", type: "service", title: "AI Animation Service", price: null,
    img: "https://res.cloudinary.com/hvncv4da/image/upload/v1792162895/6.jpg",
    desc: "Request AI-assisted animation and visual storytelling services.", deliverable: "Requirements and quotation confirmed before production." }
];

let courses = [];
let inventory = [bundle, ...services];
const formatPrice = (amount) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 0
}).format(amount);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[ch]);

function courseItem(course) {
  return {
    id: course.id, type: "course", title: course.title, price: 5000,
    img: course.image_url || "https://res.cloudinary.com/hvncv4da/image/upload/v1789913646/main-sample.png",
    desc: course.description || "Practical, structured training from TheoNet AI Academy.",
    deliverable: "Individual course access — ₦5,000. Enrolment activates after server-side payment verification."
  };
}

function renderItemCard(item) {
  const isTBC = item.type === "service";
  const typeText = item.type === "service" ? "Creative / Web Service" : item.type === "package" ? "Complete Training Package" : "Training Course";
  const buttonText = item.type === "service" ? "Request a Quote" : "Enroll Now";
  return `
    <article class="item-card">
      <img src="${escapeHtml(item.img)}" alt="${escapeHtml(item.title)}" class="item-image" loading="lazy">
      <div class="item-body">
        <span class="item-type">${typeText}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.desc)}</p>
        <div class="item-deliverable">${escapeHtml(item.deliverable)}</div>
        <div class="item-footer">
          <span class="item-price${isTBC ? " tbc" : ""}">${isTBC ? "Request a quote" : formatPrice(item.price)}</span>
          <button class="outline-btn" type="button" onclick="goToCheckout('${escapeHtml(String(item.id))}')">${buttonText}</button>
        </div>
      </div>
    </article>`;
}

function renderCatalog() {
  inventory = [bundle, ...courses.map(courseItem), ...services];
  const dashboardItems = [...courses.slice(0, 2).map(courseItem), services[0]].filter(Boolean);
  if ($("#dashboardItems")) $("#dashboardItems").innerHTML = dashboardItems.map(renderItemCard).join("") || '<p class="muted">Courses will appear here when published.</p>';
  renderCourseSearch();
  if ($("#allServicesGrid")) $("#allServicesGrid").innerHTML = services.map(renderItemCard).join("");
  const select = $("#checkoutItemSelect");
  if (select) {
    const previousSelection = select.value;
    select.innerHTML = inventory.map(item => `<option value="${escapeHtml(String(item.id))}">${escapeHtml(item.title)} — ${item.type === "service" ? "Quote required" : formatPrice(item.price)}</option>`).join("");
    const selectionStillExists = inventory.some(item => String(item.id) === previousSelection);
    select.value = selectionStillExists ? previousSelection : "bundle";
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

async function loadPublicCourses() {
  const client = window.theonet?.client;
  if (!client) {
    if ($("#allCoursesGrid")) $("#allCoursesGrid").innerHTML = '<p class="muted">Course catalogue is temporarily unavailable. Please refresh the page.</p>';
    return;
  }
  const { data, error } = await client.from("courses")
    .select("id,title,description,price_ngn,image_url")
    .eq("is_published", true).order("created_at", { ascending: false });
  if (error) {
    console.error("Could not load public courses:", error);
    if ($("#allCoursesGrid")) $("#allCoursesGrid").innerHTML = '<p class="muted">Unable to load courses right now. Please try again.</p>';
    return;
  }
  courses = data || [];
  renderCatalog();
}

renderCatalog();
$("#courseSearchInput")?.addEventListener("input", renderCourseSearch);
window.addEventListener("theonet:ready", loadPublicCourses);
if (window.theonet?.client) loadPublicCourses();

function navigate(page) {
  const target = $(`#page-${page}`);
  if (!target) return;
  $$(".page").forEach(section => section.classList.remove("active"));
  target.classList.add("active");
  $$(".nav-link").forEach(link => link.classList.toggle("active", link.dataset.page === page));
  const pageTitles = { dashboard: "Overview", courses: "Courses & Bundle", services: "Hire Services", enrollment: "Checkout & Payment", image: "Image Prompt Builder", video: "Video Outline Builder", prompts: "Prompt Builder", student: "Student Dashboard", admin: "Admin Dashboard" };
  if ($("#breadcrumb")) $("#breadcrumb").textContent = pageTitles[page] || "Overview";
  $("#sidebar")?.classList.remove("open");
  $("#mobileOverlay")?.classList.remove("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
  window.dispatchEvent(new CustomEvent("theonet:navigate", { detail: page }));
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
  if (requestedPage === "admin" && window.theonet?.profile?.role !== "admin") {
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
  const item = inventory.find(x => String(x.id) === select.value) || bundle;
  $("#summaryTitle").textContent = item.title;
  $("#summaryDesc").textContent = item.desc;
  $("#summaryDeliverable").textContent = item.deliverable;
  const isService = item.type === "service";
  const amount = isService ? "Quote required" : formatPrice(item.price);
  $("#summaryPrice").textContent = amount;
  $("#payAmountDisplay").textContent = amount;
  $("#payAmountDisplay").style.color = isService ? "var(--red)" : "var(--green)";
  $("#paystackPayBtn").disabled = isService;
  $("#paystackPayBtn").textContent = isService ? "Contact TheoNet for a Quote" : "Continue to Paystack";
  $("#tbcWarning").hidden = !isService;
}

$("#paystackPayBtn")?.addEventListener("click", async () => {
  const client = window.theonet?.client;
  const user = window.theonet?.user;
  if (!client) return showToast("Payment service is not configured. Please contact support.");
  if (!user) {
    showToast("Please sign in before making payment.");
    $("#accountBtn")?.click();
    return;
  }
  const item = inventory.find(x => String(x.id) === $("#checkoutItemSelect")?.value) || bundle;
  if (item.type === "service") return showToast("Please contact TheoNet for a service quotation.");
  const button = $("#paystackPayBtn");
  const status = $("#paymentStatus");
  button.disabled = true;
  button.textContent = "Connecting to Paystack...";
  if (status) status.textContent = "Preparing secure checkout...";
  try {
    const body = item.type === "package" ? { itemType: "bundle" } : { itemType: "course", courseId: item.id };
    const { data, error } = await client.functions.invoke("initialize-paystack-payment", { body });
    if (error) throw error;
    if (!data?.authorization_url) throw new Error(data?.error || "Paystack did not return a checkout link.");
    window.location.assign(data.authorization_url);
  } catch (err) {
    console.error("Paystack initialization failed:", err);
    if (status) status.textContent = err.message || "Unable to start payment. Please try again.";
    showToast(err.message || "Unable to start payment.");
    button.disabled = false;
    button.textContent = "Continue to Paystack";
  }
});

async function verifyPaystackReturn() {
  const params = new URLSearchParams(window.location.search);
  const reference = params.get("reference") || params.get("trxref");
  if (!reference) return;
  const statusNode = $("#paymentStatus");
  if (statusNode) statusNode.textContent = "Verifying your Paystack payment securely...";
  try {
    const client = window.theonet?.client;
    if (!client || !window.theonet?.user) {
      if (statusNode) statusNode.textContent = "Payment returned. Sign in with the same account to verify and activate your enrolment.";
      return;
    }
    const { data, error } = await client.functions.invoke("verify-paystack-payment", { body: { reference } });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.message || "Payment could not be verified.");
    if (statusNode) statusNode.textContent = "Payment verified successfully. Your course access has been activated.";
    showToast("Payment successful. Your enrolment is active.");
    navigate("student");
  } catch (err) {
    console.error("Paystack verification failed:", err);
    if (statusNode) statusNode.textContent = err.message || "Payment verification is pending. Please contact support if the amount was debited.";
    showToast(err.message || "Payment verification is pending.");
  } finally {
    params.delete("reference");
    params.delete("trxref");
    const cleanUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}
window.addEventListener("theonet:ready", verifyPaystackReturn);

window.copyText = async function(elementId) {
  const text = $(`#${elementId}`)?.textContent || "";
  try { await navigator.clipboard.writeText(text); showToast("Copied to clipboard."); }
  catch { showToast("Unable to copy automatically. Select and copy manually."); }
};

$("#generateImagePrompt")?.addEventListener("click", () => {
  const idea = $("#imageIdea").value.trim();
  if (!idea) return showToast("Enter an image idea first.");
  const style = $("#imageStyle").value;
  $("#imagePromptResult").textContent = `Style: ${style}\nSubject: ${idea}\nComposition: Clear focal subject, balanced framing, controlled lighting.`;
});
$("#generateVideoScript")?.addEventListener("click", () => {
  const idea = $("#videoIdea").value.trim();
  if (!idea) return showToast("Enter a video topic first.");
  $("#videoResult").textContent = `Topic: ${idea}\n\n1. Hook: Introduce the topic clearly.\n2. Core Walkthrough: Show practical steps.\n3. Wrap-up: Summarize key takeaway.`;
});
$("#buildPrompt")?.addEventListener("click", () => {
  const idea = $("#promptIdea").value.trim();
  if (!idea) return showToast("Enter a task or context first.");
  $("#promptResult").textContent = `Task & Context:\n${idea}\n\nOutput Rules:\n- Be clear, structured, and direct.\n- State assumptions when information is missing.`;
});

let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}
