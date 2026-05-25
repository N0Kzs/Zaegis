import { NextResponse } from "next/server";
import {
  Document,
  Packer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  AlignmentType,
  WidthType,
  BorderStyle,
  PageBreak,
} from "docx";
import prisma from "../../../lib/db";
import { format, addDays } from "date-fns";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date: weekStartStr } = body;

    if (!weekStartStr) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const weekStart = new Date(weekStartStr);
    const weekEnd = addDays(weekStart, 7);

    // Fetch schedules for the given week
    const schedules = await prisma.patrolSchedule.findMany({
      where: {
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      include: {
        patrolCar: true,
        personnel: {
          include: {
            personnel: true,
          },
        },
      },
      orderBy: [
        { date: "asc" },
        { timeSlot: "asc" }
      ],
    });

    // Group schedules by date string
    const groupedSchedules: Record<string, typeof schedules> = {};
    for (const schedule of schedules) {
      const dateStr = format(new Date(schedule.date), "yyyy-MM-dd");
      if (!groupedSchedules[dateStr]) {
        groupedSchedules[dateStr] = [];
      }
      groupedSchedules[dateStr].push(schedule);
    }

    const sortedDates = Object.keys(groupedSchedules).sort();

    // Create children array
    const docChildren: any[] = [];

    sortedDates.forEach((dateStr, index) => {
      const dailySchedules = groupedSchedules[dateStr];
      const isLast = index === sortedDates.length - 1;

      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "ILOILO POLICE MPDC",
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "Integrated Patrol Deployment Plan (IPDP)",
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: format(new Date(dateStr), "MMMM dd, yyyy"),
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({ children: [] }), // Spacing

        // Table
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
            insideVertical: { style: BorderStyle.SINGLE, size: 1 },
          },
          rows: [
            // Header row
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "Time", bold: true })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({ text: "Personnel", bold: true }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({
                          text: "Contact Number",
                          bold: true,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 10, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "Status", bold: true })],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [
                        new TextRun({ text: "Patrol Car", bold: true }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 15, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: "Areas", bold: true })],
                    }),
                  ],
                }),
              ],
            }),

            // Data rows
            ...dailySchedules.map((schedule) =>
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: schedule.timeSlot })],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: schedule.personnel
                              .map((p) => p.personnel.name)
                              .join("\n"),
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: schedule.personnel
                              .map((p) => p.personnel.contact || "N/A")
                              .join("\n"),
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: "/" })],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: schedule.patrolCar?.name || "N/A",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: schedule.areas?.join(", ") || "N/A",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              })
            ),
          ],
        }),

        // Spacing
        new Paragraph({ children: [] }),
        new Paragraph({ children: [] }),

        // Signatures
        new Paragraph({
          children: [new TextRun({ text: "Prepared by:", bold: true })],
        }),
        new Paragraph({ children: [] }),
        new Paragraph({ children: [] }),
        new Paragraph({
          children: [new TextRun({ text: "_______________________" })],
        }),
        new Paragraph({
          children: [new TextRun({ text: "Operations PNCO", bold: true })],
        }),

        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Approved by:", bold: true })],
        }),
        new Paragraph({ children: [] }),
        new Paragraph({ children: [] }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "_______________________" })],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Chief of Police", bold: true })],
        }),

        new Paragraph({ children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "CONFIDENTIAL", color: "808080" })],
        })
      );

      if (!isLast) {
        docChildren.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      }
    });

    // Handle empty state
    if (docChildren.length === 0) {
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "No deployment plans found for this week." })],
        })
      );
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                orientation: "landscape",
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    // Generate document buffer
    const buffer = await Packer.toBuffer(doc);
    const base64 = Buffer.from(buffer).toString("base64");

    return NextResponse.json({
      docxBase64: base64,
      filename: `Deployment_Plan_${format(new Date(weekStart), "yyyy-MM-dd")}.docx`,
    });
  } catch (error) {
    console.error("Error generating Word document:", error);
    return NextResponse.json(
      { error: "Failed to generate document" },
      { status: 500 }
    );
  }
}
