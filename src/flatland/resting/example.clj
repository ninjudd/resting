(ns flatland.resting.example
  (:use [flatland.resting :refer [resting file-ref]]))

(def handler (resting "things" (file-ref "things.clj")))
