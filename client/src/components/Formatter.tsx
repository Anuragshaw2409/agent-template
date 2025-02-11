import katex from "katex";
import 'katex/dist/katex.min.css';

const MessageContent = ({ content }:{content:string}) => {

    const formatLinks = (text:string) => {
        const urlRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts = text.split(urlRegex);
        
        return parts.map((part, index) => {
          if (index % 3 === 1) {
            // Link text
            return <a 
              key={index} 
              href={parts[index + 1]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              {part}
            </a>;
          } else if (index % 3 === 2) {
            // Link URL - skip it as we used it in the previous iteration
            return null;
          }
          return part;
        });
      };

      const formatLatex = (text: string) => {
        // First, replace \[ and \] with $$ while being careful with escaping
        const normalizedText = text
          .replace(/\\\[/g, '$$')
          .replace(/\\\]/g, '$$');
        
        // Split text into parts, preserving delimiters
        const parts = normalizedText.split(/(\$\$.*?\$\$|\$.*?\$)/s);
        
        return parts.map((part, index) => {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            // Display math
            try {
              const math = part.slice(2, -2).trim();
              const html = katex.renderToString(math, {
                displayMode: true,
                throwOnError: false,
                strict: false
              });
              return (
                <div 
                  key={index}
                  className="my-4 overflow-x-auto text-center"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch (error) {
              console.error('KaTeX error:', error);
              return <div key={index} className="text-red-500">Error rendering LaTeX: {part}</div>;
            }
          } else if (part.startsWith('$') && part.endsWith('$')) {
            // Inline math
            try {
              const math = part.slice(1, -1).trim();
              const html = katex.renderToString(math, {
                displayMode: false,
                throwOnError: false,
                strict: false
              });
              return (
                <span
                  key={index}
                  className="mx-1"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            } catch (error) {
              console.error('KaTeX error:', error);
              return <span key={index} className="text-red-500">Error rendering LaTeX: {part}</span>;
            }
          }
          // Regular text
          return part ? <span key={index}>{part}</span> : null;
        });
      };

  // Helper function to format inline code and bold text
  const formatText = (text:string) => {
    // First format LaTeX
    const withLatex = formatLatex(text);
    
    // Then process each text part for other formatting
    return withLatex.map((part, latexIndex) => {
      if (typeof part !== 'string') return part;
      
      // Format links
      const withLinks = formatLinks(part);
      
      return withLinks.map((linkPart, linkIndex) => {
        if (typeof linkPart !== 'string') return linkPart;
        
        // Split by inline code
        const parts = linkPart.split(/(`[^`]+`)/);
        return parts.map((codePart, index) => {
          // Handle inline code
          if (codePart.startsWith('`') && codePart.endsWith('`')) {
            return (
              <code key={`${latexIndex}-${linkIndex}-${index}`} className="bg-gray-100 text-red-500 px-1 py-0.5 rounded font-mono text-sm">
                {codePart.slice(1, -1)}
              </code>
            );
          }
          // Handle bold text in non-code parts
          const boldParts = codePart.split(/(\*\*[^*]+\*\*)/);
          return boldParts.map((boldPart, boldIndex) => {
            if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
              return (
                <strong key={`${latexIndex}-${linkIndex}-${index}-${boldIndex}`} className="font-bold">
                  {boldPart.slice(2, -2)}
                </strong>
              );
            }
            return boldPart;
          });
        });
      });
    });
  };

  // Format the content with proper handling of code blocks
  const formatSection = (text:string) => {
    const lines = text.split('\n');
    const formattedLines = [];
    let isInCodeBlock = false;
    let codeBlockContent = [];
    let currentListItems:any[] = [];
    let isInList = false;

    const processListItems = () => {
      if (currentListItems.length > 0) {
        formattedLines.push(
          <ul key={`list-${formattedLines.length}`} className="my-2">
            {currentListItems}
          </ul>
        );
        currentListItems = [];
        isInList = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();
      
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (!isInCodeBlock) {
          processListItems(); // End any current list
          isInCodeBlock = true;
          // Get the language if specified
          const language = line.trim().slice(3);
          if (language) {
            codeBlockContent.push(`// ${language}`);
          }
        } else {
          isInCodeBlock = false;
          formattedLines.push(
            <pre key={`code-${i}`} className="bg-gray-800 text-white p-4 rounded-lg my-2 overflow-x-auto font-mono text-sm">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
        }
        continue;
      }

      if (isInCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle regular text formatting
      if (line.trim()) {
        // Headers
        if (line.startsWith('###')) {
          processListItems(); // End any current list
          formattedLines.push(
            <h3 key={i} className="text-lg font-bold mt-4 mb-2">
              {formatText(line.replace('###', '').trim())}
            </h3>
          );
        }
        // Bullet points
        else if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
          isInList = true;
          currentListItems.push(
            <li key={`li-${i}`} className="ml-4">
              {formatText(line.replace(/^[•-]/, '').trim())}
            </li>
          );
        }
        // Numbered lists
        else if (/^\d+\./.test(line.trim())) {
          isInList = true;
          currentListItems.push(
            <li key={`li-${i}`} className="ml-6 list-decimal">
              {formatText(line.replace(/^\d+\./, '').trim())}
            </li>
          );
        }
        // Regular paragraphs
        else {
          processListItems(); // End any current list
          formattedLines.push(
            <p key={i} className="my-2">
              {formatText(line)}
            </p>
          );
        }
      } else if (!isInList) {
        // Empty line outside of a list
        processListItems();
      }
    }

    // Process any remaining list items
    processListItems();

    return formattedLines;
  };

  return (
    <div className="whitespace-pre-wrap break-words">
      {formatSection(content)}
    </div>
  );
};

export default MessageContent;