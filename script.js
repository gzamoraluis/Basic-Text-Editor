document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('editor');
    const filenameInput = document.getElementById('filename');
    const filetypeSelect = document.getElementById('filetype');
    const downloadBtn = document.getElementById('download-btn');
    const githubBtn = document.getElementById('github-btn');
    const githubSettings = document.getElementById('github-settings');
    
    // Cargar contenido guardado si existe
    const savedContent = localStorage.getItem('editorContent');
    if (savedContent) {
        editor.value = savedContent;
    }
    
    // Guardar contenido mientras se escribe
    editor.addEventListener('input', function() {
        localStorage.setItem('editorContent', editor.value);
    });
    
    // Descargar archivo
    downloadBtn.addEventListener('click', async function() {
        const filename = filenameInput.value || 'documento';
        const filetype = filetypeSelect.value;
        const content = editor.value;
        const fullFilename = `${filename}.${filetype}`;
        
        if (filetype === 'pdf') {
            await createAndDownloadPDF(fullFilename, content);
        } else {
            downloadTextFile(fullFilename, content);
        }
    });
    
    // Subir a GitHub
    githubBtn.addEventListener('click', async function() {
        const owner = document.getElementById('repo-owner').value;
        const repo = document.getElementById('repo-name').value;
        const path = document.getElementById('repo-path').value || '';
        const token = document.getElementById('github-token').value;
        const filename = filenameInput.value || 'documento';
        const filetype = filetypeSelect.value;
        const content = editor.value;
        const fullFilename = `${filename}.${filetype}`;
        
        if (!owner || !repo || !token) {
            alert('Por favor completa todos los campos de configuración de GitHub');
            return;
        }
        
        try {
            await uploadToGitHub(owner, repo, path, fullFilename, content, token);
            alert('Archivo subido exitosamente a GitHub');
        } catch (error) {
            console.error('Error al subir a GitHub:', error);
            alert('Error al subir el archivo: ' + error.message);
        }
    });
    
    // Funciones auxiliares
    
    function downloadTextFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        saveAs(blob, filename);
    }
    
    async function createAndDownloadPDF(filename, content) {
        try {
            const { PDFDocument, rgb } = PDFLib;
            const pdfDoc = await PDFDocument.create();
            const page = pdfDoc.addPage([550, 750]);
            
            const fontSize = 12;
            const textWidth = page.getWidth() - 100;
            
            page.drawText(content, {
                x: 50,
                y: page.getHeight() - 50,
                size: fontSize,
                color: rgb(0, 0, 0),
                maxWidth: textWidth,
                lineHeight: fontSize * 1.2
            });
            
            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            saveAs(blob, filename);
        } catch (error) {
            console.error('Error al generar PDF:', error);
            alert('Error al generar el PDF. Usando formato de texto en su lugar.');
            downloadTextFile(filename.replace('.pdf', '.txt'), content);
        }
    }
    
    async function uploadToGitHub(owner, repo, path, filename, content, token) {
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}${filename}`;
        
        // Codificar contenido en base64
        const contentBase64 = btoa(unescape(encodeURIComponent(content)));
        
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Subir archivo ${filename}`,
                content: contentBase64
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al subir el archivo');
        }
        
        return await response.json();
    }
});
// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Handle incoming files (if launched via file handler)
navigator.serviceWorker?.ready.then(registration => {
    registration.active?.postMessage('ready');
});

navigator.serviceWorker?.addEventListener('message', event => {
    if (event.data.type === 'FILE_OPEN') {
        document.getElementById('editor').value = event.data.content;
        document.getElementById('filename').value = 
            event.data.name.split('.').slice(0, -1).join('.');
        const extension = event.data.name.split('.').pop();
        const fileTypeSelect = document.getElementById('filetype');
        const option = Array.from(fileTypeSelect.options)
            .find(opt => opt.value === extension);
        if (option) option.selected = true;
    }
});
