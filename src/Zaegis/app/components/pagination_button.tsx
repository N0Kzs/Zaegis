"use client";

import { useRouter } from "next/navigation";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationEllipsis, PaginationNext } from "@/components/ui/pagination";


interface PaginationButtonProps {
  totalPages: number;
  currentPage: number;
  query?: string;
}

export function PaginationButton({ totalPages, currentPage, query }: PaginationButtonProps) {
  const router = useRouter();

  const navigate = (page: number) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  // Generate page numbers with ellipsis
  const pageNumbers = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            onClick={() => navigate(Math.max(1, currentPage - 1))} 
            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
        
        {startPage > 1 && (
          <>
            <PaginationItem>
              <PaginationLink onClick={() => navigate(1)}>1</PaginationLink>
            </PaginationItem>
            {startPage > 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
          </>
        )}
        
        {pageNumbers.map(num => (
          <PaginationItem key={num}>
            <PaginationLink 
              onClick={() => navigate(num)}
              isActive={currentPage === num}
            >
              {num}
            </PaginationLink>
          </PaginationItem>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationItem>
              <PaginationLink onClick={() => navigate(totalPages)}>
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}
        
        <PaginationItem>
          <PaginationNext 
            onClick={() => navigate(Math.min(totalPages, currentPage + 1))} 
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}