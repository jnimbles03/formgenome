import requests
import os
from urllib.parse import urlparse
from typing import List, Tuple, Optional
import time
import random

class PDFDownloader:
    def __init__(self, download_dir: str = "uploads/temp"):
        self.download_dir = download_dir
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def download_pdf(self, url: str, timeout: int = 30) -> Tuple[bool, str, Optional[str]]:
        """Download a single PDF from URL."""
        try:
            time.sleep(random.uniform(0.5, 2.0))  # Be respectful
            
            response = self.session.get(url, timeout=timeout, stream=True)
            response.raise_for_status()
            
            # Generate filename
            parsed_url = urlparse(url)
            filename = os.path.basename(parsed_url.path)
            if not filename.endswith('.pdf'):
                filename = f"document_{abs(hash(url))}.pdf"
            
            file_path = os.path.join(self.download_dir, filename)
            
            # Download the file
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            return True, f"Downloaded: {filename}", file_path
            
        except Exception as e:
            return False, f"Error: {str(e)}", None
    
    def parse_url_list(self, content: str) -> List[str]:
        """Parse URLs from uploaded text content."""
        lines = content.strip().split('\n')
        urls = []
        
        for line in lines:
            line = line.strip()
            if line and (line.startswith('http') or line.startswith('www')):
                if line.startswith('www'):
                    line = 'https://' + line
                urls.append(line)
        
        return urls
