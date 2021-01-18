import React, { useState, useEffect, useMemo, useContext } from 'react';
import { instantSearchContext } from 'react-instantsearch-core';
import { createConcurrentSafePromise } from '../lib/createConcurrentSafePromise';
import { debounce } from '../lib/debounce';

export default function useAnswers({
  searchClient,
  queryLanguages,
  attributesForPrediction,
  nbHits,
  ...extraParameters
}) {
  const context = useContext(instantSearchContext);
  const [query, setQuery] = useState();
  const [index, setIndex] = useState();
  const [isLoading, setIsLoading] = useState();
  const [hits, setHits] = useState();
  const runConcurrentSafePromise = useMemo(
    () => createConcurrentSafePromise(),
    []
  );
  const searchIndex = useMemo(() => searchClient.initIndex(index), [
    searchClient,
    index,
  ]);
  useEffect(() => {
    const unsubcribe = context.store.subscribe(() => {
      const { widgets, results } = context.store.getState();
      setQuery(widgets.query);
      setIndex(results && results.index);
    });
    return unsubcribe;
  }, [context]);
  const setDebouncedResult = useMemo(
    () =>
      debounce(result => {
        setIsLoading(false);
        setHits(result.hits);
      }, 200),
    [setIsLoading, setHits]
  );
  const fetchAnswers = _query => {
    if (!_query) {
      setIsLoading(false);
      setHits([]);
      return;
    }
    setIsLoading(true);
    runConcurrentSafePromise(
      searchIndex.findAnswers(_query, queryLanguages, {
        ...extraParameters,
        nbHits,
        attributesForPrediction,
        // eslint-disable-next-line no-warning-comments
        // FIXME: remove this x-algolia-agent once the engine accepts url encoded query params
        queryParameters: {
          'x-algolia-agent': 'answers-test',
        },
      })
    ).then(result => {
      setDebouncedResult(result);
    });
  };

  useEffect(() => {
    fetchAnswers(query);
  }, [query]);

  return { hits, isLoading };
}