# resting

Simple ref-backed restful resources.

## Usage

```clj
(ns example
  (:require [flatland.resting :refer [resting file-ref]]))

(def handler (resting "things" (file-ref "things.clj")))
```
