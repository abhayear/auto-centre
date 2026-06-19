import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const vehicleImages = [
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80",
  "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800",
  "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800",
  "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800",
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@autocentre.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: { email: adminEmail, passwordHash },
  });

  await prisma.serviceBooking.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.service.deleteMany();

  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: "Oil Change & Filter",
        description:
          "Full synthetic oil change with premium filter replacement and multi-point inspection.",
        estimatedPrice: 89,
        durationMinutes: 45,
      },
    }),
    prisma.service.create({
      data: {
        name: "Brake Inspection & Service",
        description:
          "Complete brake system inspection including pads, rotors, and fluid check.",
        estimatedPrice: 199,
        durationMinutes: 90,
      },
    }),
    prisma.service.create({
      data: {
        name: "Tire Rotation & Balance",
        description:
          "Four-wheel rotation and balance for even wear and smooth handling.",
        estimatedPrice: 59,
        durationMinutes: 60,
      },
    }),
    prisma.service.create({
      data: {
        name: "Full Diagnostic Scan",
        description:
          "Computer diagnostic scan to identify check engine lights and system faults.",
        estimatedPrice: 129,
        durationMinutes: 75,
      },
    }),
    prisma.service.create({
      data: {
        name: "Annual Service Package",
        description:
          "Comprehensive annual maintenance including fluids, filters, belts, and safety checks.",
        estimatedPrice: 349,
        durationMinutes: 180,
      },
    }),
  ]);

  const vehicles = await Promise.all([
    prisma.vehicle.create({
      data: {
        make: "BMW",
        model: "3 Series",
        year: 2024,
        price: 42900,
        mileage: 5200,
        fuelType: "Petrol",
        transmission: "Automatic",
        condition: "new",
        status: "available",
        featured: true,
        images: JSON.stringify([vehicleImages[0], vehicleImages[1]]),
        description:
          "Sporty luxury sedan with premium interior, advanced driver assistance, and exceptional handling.",
      },
    }),
    prisma.vehicle.create({
      data: {
        make: "Mercedes-Benz",
        model: "C-Class",
        year: 2023,
        price: 38900,
        mileage: 12400,
        fuelType: "Petrol",
        transmission: "Automatic",
        condition: "used",
        status: "available",
        featured: true,
        images: JSON.stringify([vehicleImages[2]]),
        description:
          "Elegant executive sedan with refined comfort, MBUX infotainment, and smooth ride quality.",
      },
    }),
    prisma.vehicle.create({
      data: {
        make: "Tesla",
        model: "Model 3",
        year: 2024,
        price: 35900,
        mileage: 3100,
        fuelType: "Electric",
        transmission: "Automatic",
        condition: "new",
        status: "available",
        featured: true,
        images: JSON.stringify([vehicleImages[3]]),
        description:
          "All-electric performance sedan with long range, autopilot features, and zero emissions.",
      },
    }),
    prisma.vehicle.create({
      data: {
        make: "Toyota",
        model: "Camry Hybrid",
        year: 2023,
        price: 27900,
        mileage: 18200,
        fuelType: "Hybrid",
        transmission: "CVT",
        condition: "used",
        status: "available",
        featured: false,
        images: JSON.stringify([vehicleImages[4]]),
        description:
          "Reliable hybrid sedan with excellent fuel economy and spacious family-friendly cabin.",
      },
    }),
    prisma.vehicle.create({
      data: {
        make: "Ford",
        model: "F-150",
        year: 2022,
        price: 32900,
        mileage: 35600,
        fuelType: "Petrol",
        transmission: "Automatic",
        condition: "used",
        status: "available",
        featured: false,
        images: JSON.stringify([vehicleImages[5]]),
        description:
          "America's best-selling truck with powerful towing capacity and versatile bed configuration.",
      },
    }),
    prisma.vehicle.create({
      data: {
        make: "Audi",
        model: "Q5",
        year: 2024,
        price: 46900,
        mileage: 8900,
        fuelType: "Plug-in Hybrid",
        transmission: "Automatic",
        condition: "new",
        status: "reserved",
        featured: false,
        images: JSON.stringify([vehicleImages[0], vehicleImages[2]]),
        description:
          "Premium compact SUV with quattro AWD, plug-in hybrid efficiency, and luxury appointments.",
      },
    }),
  ]);

  await prisma.serviceBooking.create({
    data: {
      customerName: "John Smith",
      email: "john@example.com",
      phone: "555-0101",
      vehicleInfo: "2020 Honda Accord",
      serviceId: services[0].id,
      preferredDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      preferredTime: "10:00 AM",
      notes: "Please check tire pressure as well.",
      status: "pending",
    },
  });

  await prisma.inquiry.create({
    data: {
      type: "test_drive",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "555-0102",
      message: "Interested in scheduling a test drive this weekend.",
      vehicleId: vehicles[0].id,
      status: "new",
    },
  });

  await prisma.inquiry.create({
    data: {
      type: "contact",
      name: "Mike Davis",
      email: "mike@example.com",
      phone: "555-0103",
      message: "Do you offer financing options for used vehicles?",
      status: "new",
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
