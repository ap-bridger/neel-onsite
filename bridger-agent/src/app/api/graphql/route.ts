import { greetings } from "@/server/modules/greet/api";
import {
  transactionResolvers,
  transactions,
} from "@/server/modules/transaction/api";
import { createSchema, createYoga } from "graphql-yoga";

const { handleRequest } = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Account {
        id: Int!
        name: String!
      }

      type Vendor {
        id: Int!
        name: String!
      }

      type Category {
        id: Int!
        name: String!
      }

      "One split of a transaction against a category."
      type TransactionCategory {
        id: Int!
        categoryId: Int!
        category: Category!
        "Portion of the transaction total assigned to this category"
        amount: Float!
      }

      type Transaction {
        id: Int!
        clientId: Int!
        accountId: Int!
        account: Account!
        "ISO-8601 date string"
        date: String!
        totalAmount: Float!
        "One of: needs_review, reviewed, pending, missing_info"
        status: String!
        confidence: Float!

        "Category splits proposed by the llm, with per-category amounts"
        llmCategories: [TransactionCategory!]!
        "Category splits confirmed by the reviewer, with per-category amounts"
        reviewerCategories: [TransactionCategory!]!

        "Existing vendor the llm matched, if any"
        llmVendor: Vendor
        "Vendor the llm proposed creating, when no existing vendor matched"
        llmNewVendorName: String
        "Existing vendor the reviewer matched, if any"
        reviewerVendor: Vendor
        "Vendor the reviewer proposed creating, when no existing vendor matched"
        reviewerNewVendorName: String

        updateReason: String
        missingInfoRequest: String

        llmPairTransactionId: Int
        "Offsetting transaction the llm paired this one with"
        llmPairTransaction: PairedTransaction
        reviewerPairTransactionId: Int
        "Offsetting transaction the reviewer paired this one with"
        reviewerPairTransaction: PairedTransaction
      }

      "A paired transaction, without its own nested pairs or splits."
      type PairedTransaction {
        id: Int!
        clientId: Int!
        accountId: Int!
        "ISO-8601 date string"
        date: String!
        totalAmount: Float!
        status: String!
        confidence: Float!
      }

      type Query {
        greetings: String
        """
        All transactions for a client, optionally bounded by an inclusive date
        range. Omitting a bound leaves that side of the range open.
        """
        transactions(
          clientId: Int!
          startDate: String
          endDate: String
        ): [Transaction!]!
      }
    `,
    resolvers: {
      Query: {
        greetings,
        transactions,
      },
      Transaction: transactionResolvers,
      PairedTransaction: transactionResolvers,
    },
  }),

  // While using Next.js file convention for routing, we need to configure Yoga to use the correct endpoint
  graphqlEndpoint: "/api/graphql",

  // Yoga needs to know how to create a valid Next response
  fetchAPI: { Response },
});

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as OPTIONS,
};
