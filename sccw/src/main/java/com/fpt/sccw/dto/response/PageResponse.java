package com.fpt.sccw.dto.response;

import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Generic paginated response wrapper.
 * Returned by list endpoints that support backend pagination.
 */
@Getter
public class PageResponse<T> {

    private final List<T> content;
    private final int pageNo;
    private final int pageSize;
    private final long totalElements;
    private final int totalPages;
    private final boolean last;

    /** Construct directly from a Spring Data Page of T. */
    public PageResponse(Page<T> page) {
        this.content       = page.getContent();
        this.pageNo        = page.getNumber();
        this.pageSize      = page.getSize();
        this.totalElements = page.getTotalElements();
        this.totalPages    = page.getTotalPages();
        this.last          = page.isLast();
    }

    /**
     * Construct with a manually mapped content list and the original (unmapped) Page
     * for its pagination metadata.
     */
    public PageResponse(List<T> content, Page<?> page) {
        this.content       = content;
        this.pageNo        = page.getNumber();
        this.pageSize      = page.getSize();
        this.totalElements = page.getTotalElements();
        this.totalPages    = page.getTotalPages();
        this.last          = page.isLast();
    }

    /**
     * Construct from an in-memory list that has already been sliced to one page.
     * Call this when all filtering/sorting is done in Java memory (not DB level),
     * and you have already extracted the sub-list for the requested page.
     *
     * @param pagedContent  the sub-list for the current page
     * @param pageNo        0-based page index
     * @param pageSize      requested page size
     * @param totalElements total number of elements across all pages
     */
    public PageResponse(List<T> pagedContent, int pageNo, int pageSize, long totalElements) {
        this.content       = pagedContent;
        this.pageNo        = pageNo;
        this.pageSize      = pageSize;
        this.totalElements = totalElements;
        this.totalPages    = pageSize == 0 ? 1 : (int) Math.ceil((double) totalElements / pageSize);
        this.last          = (pageNo + 1) >= this.totalPages;
    }
}
