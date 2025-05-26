
import jsPDF from 'jspdf';
import { Song } from '../data/songs';
import { getTemplateData } from './templateUtils';
import { base64ToUtf8 } from '../lib/utils';

// Helper function to decode base64 to string
const decodeFromBase64 = (base64: string): string => {
  return base64ToUtf8(base64);
};

export interface PdfPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Logo path for the first page of the PDF
const LOGO_PATH = "/uploads/1c578e45-7eb7-48b7-91bf-237ccf296b4a.png";

// Default padding if not provided
const defaultPadding: PdfPadding = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20
};

// Get padding settings from template selector
let getPaddingSettings: () => PdfPadding;
try {
  // Dynamic import to avoid circular dependency
  import('../components/TemplateSelector').then(module => {
    getPaddingSettings = module.getPaddingSettings;
  });
} catch (error) {
  // Fallback to default padding if there's an error
  getPaddingSettings = () => defaultPadding;
}

export const generateLyricsPDF = async (songs: Song[], customPadding?: PdfPadding): Promise<void> => {
  if (songs.length === 0) return;

  // Use custom padding if provided, otherwise use global settings or default
  const padding = customPadding || (getPaddingSettings ? getPaddingSettings() : defaultPadding);

  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Get page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Apply the selected template as background to the first page
  const templateBase64 = await getTemplateData();
  if (templateBase64) {
    try {
      // Add the background to the first page
      doc.addImage(templateBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.error("Error adding template background to first page:", error);
    }
  }
  
  // Add the logo to the first page (on top of template)
  addLogoToFirstPage(doc, pageWidth, pageHeight);
  
  // Start on the second page for song content
  doc.addPage();
  
  // Calculate usable area based on padding
  const usableWidth = pageWidth - padding.left - padding.right;
  
  // Apply the selected template as background to second page
  if (templateBase64) {
    try {
      // Add the background to the current page (which is the second page)
      doc.addImage(templateBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.error("Error adding template background:", error);
    }
  }

  // Starting position respecting top padding
  let yPosition = padding.top;

  // Process each song
  songs.forEach((song, index) => {
    // Set font to Helvetica (built into jsPDF) and bold for titles
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    
    // Handle long titles by splitting them into multiple lines if needed
    const titleLines = doc.splitTextToSize(song.title, usableWidth);
    
    // Center each line of the title
    titleLines.forEach((line: string) => {
      const titleLineWidth = doc.getStringUnitWidth(line) * 20 / doc.internal.scaleFactor;
      const titleX = padding.left + (usableWidth - titleLineWidth) / 2;
      
      doc.text(line, titleX, yPosition);
      yPosition += 10; // Spacing between title lines
    });
    
    yPosition += 10; // Increased spacing after the complete title to separate from lyrics
    
    // Decode the base64 lyrics and format them
    const decodedLyrics = decodeFromBase64(song.lyrics);
    
    // Switch to regular Helvetica for lyrics
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    // Split lyrics into lines
    const lyricsLines = decodedLyrics.split('\n');
    
    lyricsLines.forEach(line => {
      // Check if we need a new page based on bottom padding
      if (yPosition > pageHeight - padding.bottom) {
        doc.addPage();
        yPosition = padding.top;
        
        // Add the template background to new pages as well
        if (templateBase64) {
          try {
            doc.addImage(templateBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
          } catch (error) {
            console.error("Error adding template background to new page:", error);
          }
        }
      }
      
      // Only process non-empty lines
      if (line.trim().length > 0) {
        // Check if line is too long and needs to be wrapped
        const wrappedLines = doc.splitTextToSize(line, usableWidth);
        
        // Center and add each wrapped line
        wrappedLines.forEach((wrappedLine: string, wIdx: number) => {
          const lineWidth = doc.getStringUnitWidth(wrappedLine) * 12 / doc.internal.scaleFactor;
          const lineX = padding.left + (usableWidth - lineWidth) / 2;
          
          doc.text(wrappedLine, lineX, yPosition);
          
          // Add spacing except after last wrapped part of this line
          if (wIdx < wrappedLines.length - 1) {
            yPosition += 5; // Less space between wrapped parts of same line
          }
        });
        
        // Add full line spacing after all wrapped parts of a line
        yPosition += 7;
      } else {
        // Add spacing for empty lines
        yPosition += 7;
      }
    });
    
    // Add spacing between songs
    if (index < songs.length - 1) {
      // Add a subtle divider line between songs
      yPosition += 15; // Space before divider
      
      // Draw a light gray horizontal line
      doc.setDrawColor(200, 200, 200); // Light gray color
      doc.line(padding.left, yPosition, pageWidth - padding.right, yPosition);
      
      // Extra spacing after the divider
      yPosition += 25; // Space after divider
      
      // Check if we need a new page for the next song based on bottom padding
      if (yPosition > pageHeight - padding.bottom) {
        doc.addPage();
        yPosition = padding.top;
        
        // Add the template background to the new page
        if (templateBase64) {
          try {
            doc.addImage(templateBase64, 'JPEG', 0, 0, pageWidth, pageHeight);
          } catch (error) {
            console.error("Error adding template background to new page:", error);
          }
        }
      }
    } else {
      // Add some bottom padding for the last song too
      yPosition += 15;
    }
  });
  
  // Save the PDF
  doc.save('song-lyrics.pdf');
};

// Function to add the logo to the first page
const addLogoToFirstPage = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  // Create a temporary image to get dimensions
  const img = new Image();
  img.src = LOGO_PATH;
  
  // Set square dimensions for the logo (1:1 aspect ratio)
  const logoWidth = 80; // in mm
  const logoHeight = 75 // in mm
  
  // Calculate position to center the logo
  const x = (pageWidth - logoWidth) / 2;
  const y = (pageHeight - logoHeight) / 2 - 10; // Slightly above center to make room for title
  
  // Add the logo with square dimensions
  try {
    doc.addImage(LOGO_PATH, 'PNG', x, y, logoWidth, logoHeight);
    
    // Add title below the logo
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    // const title = "Strums 'n Hums";
    // const titleWidth = doc.getStringUnitWidth(title) * 24 / doc.internal.scaleFactor;
    // const titleX = (pageWidth - titleWidth) / 2;
    // doc.text(title, titleX, y + logoSize + 20);
  } catch (error) {
    console.error("Error adding logo to PDF:", error);
  }
};
