import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const doc = new jsPDF('p', 'mm', 'a4');
let currentY = 20;

const addImageToDoc = async (url, title) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const base64data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      
      const imgType = base64data.substring(base64data.indexOf('/') + 1, base64data.indexOf(';')).toUpperCase();
      const format = imgType === 'PNG' ? 'PNG' : (imgType === 'WEBP' ? 'WEBP' : 'JPEG');
      
      doc.addImage(base64data, format, 20, currentY, 100, 75);
      currentY += 85;
    } catch (e) {
      console.error("Failed to load image for PDF:", e);
      throw e; // re-throw to see if it escapes
    }
};

async function run() {
  try {
    const imageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    await addImageToDoc(imageData, "Test Title");
    console.log("Success");
  } catch (e) {
    console.error("Uncaught exception in run():", e);
  }
}

run();
