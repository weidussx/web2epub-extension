# Web to EPUB Chrome Extension

A Chrome extension that allows you to convert web articles into EPUB format for offline reading.

## Features

- **One-Click Conversion**: Convert any web article to EPUB format with a single click
- **Smart Content Extraction**: Automatically extracts the main content of articles using Readability.js
- **Image Support**: Preserves images from the original article
- **Clean Reading Experience**: Removes ads and unnecessary elements
- **Customizable Output**: Generates well-formatted EPUB files with proper metadata
- **User-Friendly Interface**: Simple and intuitive popup interface

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the `dist` directory from this project

## Usage

1. Navigate to any article you want to save
2. Click the Web to EPUB extension icon in your Chrome toolbar
3. The extension will automatically extract the article content
4. Click "Save as EPUB" to download the article in EPUB format
5. Open the downloaded file with your favorite EPUB reader

## Technical Details

- Built with vanilla JavaScript
- Uses [Readability.js](https://github.com/mozilla/readability) for content extraction
- Uses [JSZip](https://github.com/Stuk/jszip) for EPUB file generation
- Follows EPUB 3.0 specification
- Supports modern web standards

## Features in Detail

### Content Extraction
- Automatically identifies the main article content
- Removes ads, navigation, and other distracting elements
- Preserves article structure and formatting

### Image Handling
- Downloads and embeds images from the article
- Converts images to base64 format
- Handles image loading failures gracefully

### EPUB Generation
- Creates valid EPUB 3.0 files
- Includes proper metadata (title, author, date)
- Generates table of contents
- Optimizes file size

### User Interface
- Fixed header with title and save button
- Real-time content preview
- Progress indicators
- Error handling and notifications
- Responsive design

## Limitations

- Maximum file size: 10MB
- Some websites may block content extraction
- Complex layouts might not be perfectly preserved
- Dynamic content may not be captured

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Readability.js](https://github.com/mozilla/readability) by Mozilla
- [JSZip](https://github.com/Stuk/jszip) by Stuart Knightley 