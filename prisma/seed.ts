import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  DEFAULT_SERVICE_SCHEDULE_CONTENT,
  DEFAULT_SERVICE_SCHEDULE_SUMMARY,
  DEFAULT_SERVICE_SCHEDULE_TITLE,
} from "../src/lib/service-schedule-default";

const prisma = new PrismaClient();

const defaultBusinessHours = JSON.stringify([
  { day: "Monday – Saturday", hours: "9:00 AM – 7:00 PM" },
  { day: "Sunday", hours: "10:00 AM – 5:00 PM" },
]);

const vehicleImages = [
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
  "https://images.unsplash.com/photo-1622185135855-8812708b39f0?w=800",
  "https://images.unsplash.com/photo-1568772585407-9361f9bf3a64?w=800",
  "https://images.unsplash.com/photo-1609630875178-ab881f83d910?w=800",
  "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800",
  "https://images.unsplash.com/photo-1594787318286-3d835c1d5f7f?w=800",
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@autogalaxy.in";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash },
  });

  await prisma.serviceBooking.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceArea.deleteMany();

  await Promise.all([
    prisma.serviceArea.create({
      data: { name: "Lalitpur", pinCode: "284403", active: true },
    }),
    prisma.serviceArea.create({
      data: { name: "Civil Line, Lalitpur", pinCode: "284403", active: true },
    }),
    prisma.serviceArea.create({
      data: { name: "Siddhan Road, Lalitpur", active: true },
    }),
    prisma.serviceArea.create({
      data: { name: "Jhansi", pinCode: "284001", active: true },
    }),
    prisma.serviceArea.create({
      data: { name: "Mahroni", pinCode: "284405", active: true },
    }),
    prisma.serviceArea.create({
      data: { name: "Talbehat", pinCode: "284126", active: true },
    }),
  ]);

  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: "Battery Health Check",
        description:
          "Complete battery pack inspection, cell balance check, and range assessment for your e-scooter.",
        estimatedPrice: 499,
        durationMinutes: 45,
      },
    }),
    prisma.service.create({
      data: {
        name: "Motor & Controller Diagnostic",
        description:
          "Computer diagnostic scan for motor, controller, and wiring faults on electric 2-wheelers.",
        estimatedPrice: 899,
        durationMinutes: 90,
      },
    }),
    prisma.service.create({
      data: {
        name: "Brake Service",
        description:
          "Disc and drum brake inspection, pad replacement, and brake fluid check for safe stopping.",
        estimatedPrice: 599,
        durationMinutes: 60,
      },
    }),
    prisma.service.create({
      data: {
        name: "Tyre Replacement & Alignment",
        description:
          "New tyres fitted and wheel alignment for smooth, safe rides on city roads.",
        estimatedPrice: 799,
        durationMinutes: 75,
      },
    }),
    prisma.service.create({
      data: {
        name: "General E-Scooter Service",
        description:
          "Comprehensive service including suspension check, lights, horn, and safety inspection.",
        estimatedPrice: 699,
        durationMinutes: 120,
      },
    }),
    prisma.service.create({
      data: {
        name: "Charger & Wiring Inspection",
        description:
          "Charger port, onboard charger, and high-voltage wiring inspection for safe charging.",
        estimatedPrice: 399,
        durationMinutes: 45,
      },
    }),
  ]);

  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        make: "Ola",
        model: "S1 Pro",
        year: 2024,
        price: 149999,
        mileage: 3200,
        fuelType: "Electric",
        transmission: "Automatic",
        condition: "new",
        status: "available",
        featured: true,
        images: JSON.stringify([vehicleImages[0], vehicleImages[1]]),
        description:
          "Popular electric scooter with 181 km IDC range, 115 km/h top speed, and smart connectivity features.",
      },
    }),
    prisma.vehicle.create({
      data: {
        make: "Ather",
        model: "450X",
        year: 2024,
        price: 159999,
        mileage: 5100,
        fuelType: "Electric",
        transmission: "Automatic",
        condition: "used",
        status: "available",
        featured: true,
        images: JSON.stringify([vehicleImages[2]]),
        description:
          "Premium electric scooter with Pro Pack, fast charging support, and refined ride quality.",
      },
    }),
    prisma.vehicle.create({
      data: {
        make: "TVS",
        model: "iQube",
        year: 2024,
        price: 124900,
        mileage: 1800,
        fuelType: "Electric",
        transmission: "Automatic",
        condition: "new",
        status: "available",
        featured: true,
        images: JSON.stringify([vehicleImages[3]]),
        description:
          "Reliable family e-scooter with comfortable seating, smart XConnect features, and efficient range.",
      },
    }),
    prisma.vehicle.create({
      data: {
        make: "Bajaj",
        model: "Chetak",
        year: 2023,
        price: 134000,
        mileage: 9800,
        fuelType: "Electric",
        transmission: "Automatic",
        condition: "used",
        status: "available",
        featured: false,
        images: JSON.stringify([vehicleImages[4]]),
        description:
          "Stylish retro-inspired electric scooter with solid build quality and smooth city performance.",
      },
    }),
    prisma.vehicle.create({
      data: {
        make: "Hero",
        model: "Vida V1 Pro",
        year: 2024,
        price: 145000,
        mileage: 2400,
        fuelType: "Electric",
        transmission: "Automatic",
        condition: "new",
        status: "available",
        featured: false,
        images: JSON.stringify([vehicleImages[5]]),
        description:
          "Feature-rich electric scooter with removable battery option and multiple riding modes.",
      },
    }),
    prisma.vehicle.create({
      data: {
        make: "Okinawa",
        model: "Okhi90",
        year: 2023,
        price: 110000,
        mileage: 14200,
        fuelType: "Electric",
        transmission: "Automatic",
        condition: "used",
        status: "reserved",
        featured: false,
        images: JSON.stringify([vehicleImages[0], vehicleImages[3]]),
        description:
          "Budget-friendly electric scooter ideal for daily commuting with practical range and storage.",
      },
    }),
  ]);

  await prisma.serviceBooking.create({
    data: {
      customerName: "Rahul Sharma",
      email: "rahul@example.com",
      phone: "7985831851",
      customerArea: "Civil Line, Lalitpur",
      vehicleInfo: "2023 TVS iQube",
      serviceId: services[0].id,
      preferredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      preferredTime: "10:00 AM",
      notes: "Battery range seems reduced lately.",
      status: "pending",
    },
  });

  await prisma.inquiry.create({
    data: {
      type: "test_drive",
      name: "Priya Verma",
      email: "priya@example.com",
      phone: "8090953096",
      message: "Interested in a test ride for Ola S1 Pro this weekend.",
      vehicleId: vehicles[0].id,
      status: "new",
    },
  });

  await prisma.inquiry.create({
    data: {
      type: "contact",
      name: "Amit Singh",
      email: "amit@example.com",
      phone: "9876543210",
      message: "Do you offer exchange for old petrol scooters?",
      status: "new",
    },
  });

  const jobs = await Promise.all([
    prisma.jobPosting.create({
      data: {
        title: "E-Scooter Sales Executive",
        department: "Sales",
        location: "Lalitpur, UP",
        employmentType: "full_time",
        salaryRange: "₹15,000 - ₹25,000 + commission",
        description:
          "Help customers choose the right electric 2-wheeler. Conduct test rides, explain features and financing, and deliver a smooth buying experience at our Civil Line showroom.",
        requirements:
          "1+ years sales experience preferred.\nValid two-wheeler driving licence.\nGood communication in Hindi and English.\nInterest in electric vehicles is a plus.",
      },
    }),
    prisma.jobPosting.create({
      data: {
        title: "Electric Vehicle Service Technician",
        department: "Service",
        location: "Lalitpur, UP",
        employmentType: "full_time",
        salaryRange: "₹18,000 - ₹28,000",
        description:
          "Diagnose and repair electric scooters — battery systems, motors, controllers, brakes, and general maintenance in our Lalitpur service bay.",
        requirements:
          "ITI or diploma in automobile/electrical trade.\n2+ years two-wheeler or EV repair experience.\nAbility to read wiring diagrams and use diagnostic tools.\nSafety-conscious team player.",
      },
    }),
    prisma.jobPosting.create({
      data: {
        title: "Service Advisor",
        department: "Service",
        location: "Lalitpur, UP",
        employmentType: "part_time",
        salaryRange: "₹12,000 - ₹18,000/month",
        description:
          "Greet service customers, schedule appointments, explain recommended work, and keep customers updated on repair status.",
        requirements:
          "Customer-facing experience required.\nBasic knowledge of two-wheelers.\nOrganized and professional.\nAvailable on Saturdays.",
      },
    }),
  ]);

  await prisma.jobApplication.create({
    data: {
      jobId: jobs[0].id,
      name: "Vikram Yadav",
      email: "vikram@example.com",
      phone: "9123456789",
      resumeUrl: "https://linkedin.com/in/vikramyadav",
      coverLetter:
        "I have 2 years of sales experience and am passionate about promoting electric mobility in Lalitpur.",
      status: "new",
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      businessHours: defaultBusinessHours,
      noticeActive: false,
    },
  });

  await prisma.serviceScheduleContent.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      title: DEFAULT_SERVICE_SCHEDULE_TITLE,
      summary: DEFAULT_SERVICE_SCHEDULE_SUMMARY,
      content: DEFAULT_SERVICE_SCHEDULE_CONTENT,
      published: true,
    },
  });

  console.log("Seed completed successfully.");
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
