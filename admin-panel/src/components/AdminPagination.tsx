import { Pagination } from "@heroui/react";

interface AdminPaginationProps {
  page: number;
  total: number;
  onChange: (page: number) => void;
  siblings?: number;
  className?: string;
}

function buildPageRange(page: number, total: number, siblings = 2): Array<number | "ellipsis-start" | "ellipsis-end"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const left = Math.max(2, page - siblings);
  const right = Math.min(total - 1, page + siblings);
  const pages: Array<number | "ellipsis-start" | "ellipsis-end"> = [1];

  if (left > 2) {
    pages.push("ellipsis-start");
  } else {
    for (let index = 2; index < left; index += 1) {
      pages.push(index);
    }
  }

  for (let index = left; index <= right; index += 1) {
    pages.push(index);
  }

  if (right < total - 1) {
    pages.push("ellipsis-end");
  } else {
    for (let index = right + 1; index < total; index += 1) {
      pages.push(index);
    }
  }

  pages.push(total);
  return pages;
}

export function AdminPagination({
  page,
  total,
  onChange,
  siblings = 2,
  className
}: AdminPaginationProps) {
  const safeTotal = Math.max(1, total);
  const safePage = Math.min(Math.max(1, page), safeTotal);
  const pages = buildPageRange(safePage, safeTotal, siblings);

  return (
    <Pagination className={className} aria-label="Pagination">
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            onPress={() => {
              if (safePage > 1) {
                onChange(safePage - 1);
              }
            }}
            isDisabled={safePage <= 1}
          >
            <span className="sr-only">Previous</span>
          </Pagination.Previous>
        </Pagination.Item>

        {pages.map(item => {
          if (item === "ellipsis-start" || item === "ellipsis-end") {
            return (
              <Pagination.Item key={item}>
                <Pagination.Ellipsis />
              </Pagination.Item>
            );
          }

          return (
            <Pagination.Item key={item}>
              <Pagination.Link
                isActive={item === safePage}
                aria-label={`Go to page ${item}`}
                onPress={() => onChange(item)}
              >
                {item}
              </Pagination.Link>
            </Pagination.Item>
          );
        })}

        <Pagination.Item>
          <Pagination.Next
            onPress={() => {
              if (safePage < safeTotal) {
                onChange(safePage + 1);
              }
            }}
            isDisabled={safePage >= safeTotal}
          >
            <span className="sr-only">Next</span>
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  );
}
