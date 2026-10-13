"use client";

/**
 * "Print" link on the annual report page. With JavaScript it opens the
 * browser's print dialog for this same page (the print stylesheet in
 * public.css strips the header, footer and green ground). Without
 * JavaScript it is just a link to the same page.
 */
export function PrintButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="pub-btn pub-btn-paper no-print"
      onClick={(e) => {
        e.preventDefault();
        window.print();
      }}
    >
      Print this report
    </a>
  );
}
